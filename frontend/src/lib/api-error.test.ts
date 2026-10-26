import { describe, expect, it } from "vitest";
import axios from "axios";
import { getApiErrorDetails, getApiErrorMessage } from "./api-error";

describe("API error helpers", () => {
  it("returns server and field validation messages", () => {
    const error = new axios.AxiosError("Request failed");
    error.response = {
      data: {
        message: "Data tidak valid.",
        errors: { address: ["Alamat wajib diisi."], phone: ["Nomor telepon salah.", "Periksa kembali."] },
      },
      status: 422,
      statusText: "Unprocessable Entity",
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
    };

    expect(getApiErrorDetails(error, "Fallback")).toEqual({
      message: "Data tidak valid.",
      fields: { address: "Alamat wajib diisi.", phone: "Nomor telepon salah." },
      validationMessages: ["Alamat wajib diisi.", "Nomor telepon salah.", "Periksa kembali."],
    });
  });

  it("uses the first field error when the server has no general message", () => {
    const error = new axios.AxiosError("Request failed");
    error.response = {
      data: { errors: { address: ["Alamat wajib diisi."] } },
      status: 422,
      statusText: "Unprocessable Entity",
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
    };

    expect(getApiErrorMessage(error, "Fallback")).toBe("Alamat wajib diisi.");
  });

  it("uses the fallback for non-API errors", () => {
    expect(getApiErrorDetails(new Error("Unexpected"), "Fallback")).toEqual({
      message: "Fallback",
      fields: {},
      validationMessages: [],
    });
  });
});
