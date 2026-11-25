import { useEffect, useRef, useState } from "react";
export function CameraCapture({
  add,
  close,
}: {
  add: (file: File) => void;
  close: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let stream: MediaStream | undefined;
    let active = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera unavailable in this browser. Upload a photo instead.");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((value) => {
        if (!active) {
          value.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = value;
        if (video.current) video.current.srcObject = value;
      })
      .catch(() =>
        setError("Camera unavailable. Allow camera access or upload a photo."),
      );
    return () => {
      active = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  return (
    <div className="camera-capture" role="region" aria-label="Camera">
      <video
        ref={video}
        autoPlay
        muted
        playsInline
        onLoadedData={() => setReady(true)}
      />
      {error && <p role="alert">{error}</p>}
      <button
        disabled={!ready}
        onClick={() => {
          const v = video.current!;
          const canvas = document.createElement("canvas");
          canvas.width = v.videoWidth;
          canvas.height = v.videoHeight;
          canvas.getContext("2d")!.drawImage(v, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                add(new File([blob], "camera.jpg", { type: "image/jpeg" }));
                close();
              }
            },
            "image/jpeg",
            0.9,
          );
        }}
      >
        Take photo
      </button>
      <button onClick={close}>Close camera</button>
    </div>
  );
}
