import { normalizeVideoUrl } from "./cloudinary";

describe("normalizeVideoUrl", () => {
  it("inserta la transformacion de tamaño en una URL de video de Cloudinary", () => {
    const input =
      "https://res.cloudinary.com/demo/video/upload/v123/tauros/ejercicios/video/abc.mp4";
    expect(normalizeVideoUrl(input)).toBe(
      "https://res.cloudinary.com/demo/video/upload/c_fill,w_960,h_540/v123/tauros/ejercicios/video/abc.mp4",
    );
  });

  it("no duplica la transformacion si la URL ya la tiene", () => {
    const input =
      "https://res.cloudinary.com/demo/video/upload/c_fill,w_960,h_540/v123/abc.mp4";
    expect(normalizeVideoUrl(input)).toBe(input);
  });

  it("deja intacta una URL que no es de Cloudinary video/upload", () => {
    const input =
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    expect(normalizeVideoUrl(input)).toBe(input);
  });

  it("maneja undefined/vacio sin romper", () => {
    expect(normalizeVideoUrl(undefined)).toBe("");
    expect(normalizeVideoUrl("")).toBe("");
  });

  it("deja intacta una URL invalida sin explotar", () => {
    expect(normalizeVideoUrl("no-es-una-url")).toBe("no-es-una-url");
  });
});
