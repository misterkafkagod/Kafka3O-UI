// ProductionChangeCanceled means a Production write was abandoned before any request was sent.
export class ProductionChangeCanceled extends Error {
  constructor() {
    super("The Production change was canceled before it was sent.");
    this.name = "ProductionChangeCanceled";
  }
}
