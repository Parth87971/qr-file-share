window.startScanner = (videoRef, canvasRef, setIsScanning, setDecodedChunks, setFileMetadata, setScanResult, setUserMessage, showNotification) => {
  console.log("Starting scanner...");
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .catch(() => navigator.mediaDevices.getUserMedia({ video: true }))
    .then(stream => {
      console.log("Camera stream obtained:", stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => console.error("Play error:", err));
        videoRef.current.muted = true;
        setIsScanning(true);
        setUserMessage('Scanning for QR codes...');
        scanQRCode();
      }
    })
    .catch(err => {
      console.error("Camera error:", err.name, err.message);
      showNotification('Camera access failed: ' + err.message + '. Check permissions.', 'error');
    });

  function scanQRCode() {
    if (!setIsScanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (window.jsQR) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          try {
            const data = JSON.parse(code.data);
            if (data.chunk !== undefined && data.total !== undefined && data.data) {
              setDecodedChunks(prev => {
                if (!prev[data.chunk]) {
                  const newChunks = { ...prev, [data.chunk]: data.data };
                  setFileMetadata({ chunks: data.total });
                  if (Object.keys(newChunks).length === data.total) {
                    assembleFile(newChunks, data.name, data.type);
                  }
                  return newChunks;
                }
                return prev;
              });
              showNotification(`Chunk ${data.chunk + 1} of ${data.total} received.`, 'success');
            }
          } catch (e) {
            console.error("JSON parse error:", e);
          }
        }
      }
    }

    requestAnimationFrame(scanQRCode);
  }

  function assembleFile(chunks, fileName, fileType) {
    const sortedChunks = Object.values(chunks).sort((a, b) => a.chunk - b.chunk);
    const byteArrays = sortedChunks.map(chunk => new Uint8Array(chunk));
    const fullArray = new Uint8Array(byteArrays.reduce((acc, curr) => acc.concat(curr), []));
    const blob = new Blob([fullArray], { type: fileType });
    const url = URL.createObjectURL(blob);
    setScanResult({ name: fileName, data: url });
    setUserMessage(`${fileName} assembled!`);
    showNotification(`${fileName} assembled! Click Download.`, 'success');
  }
};

window.stopScanner = (setIsScanning, setUserMessage, showNotification) => {
  if (videoRef.current && videoRef.current.srcObject) {
    videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    videoRef.current.srcObject = null;
  }
  setIsScanning(false);
  setUserMessage('Scanner stopped.');
  showNotification('Scanner stopped.', 'info');
};