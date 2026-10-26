import { describe, expect, it } from "vitest";
import { getGoogleMapsDirectionsUrl } from "./location";

describe("getGoogleMapsDirectionsUrl", () => {
  it("uses seller coordinates as the encoded directions destination", () => {
    expect(getGoogleMapsDirectionsUrl({ latitude: -6.88, longitude: 109.14 }))
      .toBe("https://www.google.com/maps/dir/?api=1&destination=-6.88%2C109.14");
  });

  it("falls back to an encoded store address when coordinates are missing", () => {
    expect(getGoogleMapsDirectionsUrl({ address: "Jl. Mawar No. 1, Tegal" }))
      .toBe("https://www.google.com/maps/dir/?api=1&destination=Jl.%20Mawar%20No.%201%2C%20Tegal");
  });

  it("does not create a directions link without a usable destination", () => {
    expect(getGoogleMapsDirectionsUrl({ latitude: null, longitude: null, address: "  " })).toBeNull();
  });
});
