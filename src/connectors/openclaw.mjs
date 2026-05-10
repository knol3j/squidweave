import { BaseConnector } from "./base.mjs";

export class OpenclawConnector extends BaseConnector {
  constructor(options) {
    super("openclaw", options);
  }
}
