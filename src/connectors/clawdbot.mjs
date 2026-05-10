import { OpenclawConnector } from "./openclaw.mjs";

export class ClawdbotConnector extends OpenclawConnector {
  constructor(options) {
    super(options);
    this.name = "clawdbot";
  }
}
