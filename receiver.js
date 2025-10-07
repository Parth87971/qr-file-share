window.startScanner = (videoRef, canvasRef, setIsScanning, setDecodedChunks, setFileMetadata, setScanResult, setUserMessage, showNotification) => {
  console.log("Starting scanner...");
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .catch(() => navigator.mediaDevices.getUserMedia({ video: true }))
    .then(stream => {
      console.log("Camera stream obtained:", stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play()
          .then(() => {
            setIsScanning(true);
            setUserMessage('Scanning for QR codes...');
            scanQRCode();
          })
          .catch(err => console.error("Play error:", err));
        videoRef.current.muted = true;
      }
    })
    .catch(err => {
      console.error("Camera error:", err);
      showNotification('Camera access failed: ' + (err.message || 'Check permissions.'), 'error');
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
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = window.jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        try {
          const data = JSON.parse(code.data);
          if (data.chunk !== undefined && data.total !== undefined && data.data) {
            const byteArray = new Uint8Array([...atob(data.data)].map(char => char.charCodeAt(0)));
            setDecodedChunks(prev => {
              if (!prev[data.chunk]) {
                const newChunks = { ...prev, [data.chunk]: byteArray };
                if (Object.keys(newChunks).length === data.total) {
                  assembleFile(newChunks, data.name, data.type);
                }
                return newChunks;
              }
              return prev;
            });
            setFileMetadata({ chunks: data.total });
            showNotification(`Chunk ${data.chunk + 1} of ${data.total} received.`, 'success');
          }
        } catch (e) {
          console.error("JSON parse error:", e);
        }
      }
    }
    if (isScanning) requestAnimationFrame(scanQRCode);
  }

  function assembleFile(chunks, fileName, fileType) {
    const sortedKeys = Object.keys(chunks).sort((a, b) => a - b);
    const byteArrays = sortedKeys.map(key => chunks[key]);
    const fullArray = new Uint8Array(byteArrays.reduce((acc, curr) => acc.concat(Array.from(curr)), []));
    const blob = new Blob([fullArray], { type: fileType });
    const url = URL.createObjectURL(blob);
    setScanResult({ name: fileName, data: url, type: fileType });
    showNotification(`${fileName} assembled! Click Download.`, 'success');
  }
};

window.stopScanner = (videoRef, setIsScanning, setUserMessage, showNotification) => {
  if (videoRef.current && videoRef.current.srcObject) {
    videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    videoRef.current.srcObject = null;
  }
  setIsScanning(false);
  setUserMessage('Scanner stopped.');
  showNotification('Scanner stopped.', 'info');
};