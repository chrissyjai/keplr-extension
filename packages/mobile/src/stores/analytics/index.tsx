import { Amplitude } from "@amplitude/react-native";
import { makeObservable, observable } from "mobx";
import {
  AccountStore,
  AccountSetBase,
  KeyRingStore,
} from "@keplr-wallet/stores";
import { FeeType } from "@keplr-wallet/hooks";

import { sha256 } from "sha.js";

export interface EventProperties extends Record<string, unknown> {
  chainId?: string;
  chainName?: string;
  toChainId?: string;
  toChainName?: string;
  validatorName?: string;
  toValidatorName?: string;
  amount?: string;
  denom?: string;
  proposalId?: string;
  proposalTitle?: string;
  linkTitle?: string;
  linkUrl?: string;
  registerType?: "seed" | "google" | "ledger" | "qr";
  accountType?: "mnemonic" | "privateKey" | "ledger";
  feeType?: FeeType | undefined;
  authType?: "biometrics" | "password";
  fromScreen?: string;
}
export interface UserProperties {
  registerType?: "seed" | "google" | "ledger" | "qr";
  accountType?: "mnemonic" | "privateKey" | "ledger";
  currency?: string;
  hasMobileAccount?: boolean;
}

export class AnalyticsStore {
  @observable
  protected _isInitialized: boolean = false;
  protected _mainChainId: string = "cosmoshub-4";

  protected amplitudeAnalytics?: Amplitude;

  constructor(
    protected readonly appName: string,
    protected readonly accountStore: AccountStore<AccountSetBase<any, any>>,
    protected readonly keyRingStore: KeyRingStore
  ) {
    makeObservable(this);

    this.initializeAnalytics();
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  get mainChainId(): string {
    return this._mainChainId;
  }

  initializeAnalytics(): void {
    this.amplitudeAnalytics = Amplitude.getInstance();
    this.amplitudeAnalytics.init("03e0234602d4044c9123bdad308fa1bc");

    this._isInitialized = true;
  }

  // Set the user id with the hashed address.
  // Use this address with common address that can be dealt with the user without considering the selected chain.
  // For example, the address will be different according to the chains (cosmoshub, secret, kava...),
  // but we want to classify the user without considering the chains.
  // So, I recommend to use only the address of the main chain (probably cosmoshub).
  setUserId(bech32Address?: string): void {
    const accountInfo = this.accountStore.getAccount(this.mainChainId);

    if (!this.amplitudeAnalytics || (!bech32Address && !accountInfo)) {
      return;
    }

    const hashed = new sha256()
      .update(bech32Address ? bech32Address : accountInfo.bech32Address)
      .digest("hex");
    this.amplitudeAnalytics.setUserId(hashed);
    this.setUserProperties({ hasMobileAccount: true });
  }

  setUserProperties(userProperties?: UserProperties): void {
    if (!this.amplitudeAnalytics) {
      return;
    }

    this.amplitudeAnalytics.setUserProperties({
      accountType: this.keyRingStore.keyRingType,
      ...userProperties,
    });
  }

  logEvent(
    eventName: string,
    eventProperties?: EventProperties | undefined
  ): void {
    if (!eventName || !this.amplitudeAnalytics) {
      return;
    }

    this.amplitudeAnalytics.logEvent(eventName, eventProperties);
  }

  logScreenView(
    screenName: string,
    eventProperties?: EventProperties | undefined
  ): void {
    this.logEvent(`${screenName} viewed`, eventProperties);
  }
}
