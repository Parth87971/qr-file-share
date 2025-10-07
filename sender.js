window.startTransfer = (file, setQrCode, setUploadProgress, setIsGenerating, setUserMessage, setFileMetadata, showNotification) => {
  setIsGenerating(true);
  setUploadProgress(0);
  setUserMessage(`Processing ${file.name} for transfer...`);

  const chunkSize = 1000; // Reduced to fit within QR limit with base64
  const totalChunks = Math.ceil(file.size / chunkSize);
  setFileMetadata({ chunks: totalChunks });
  setUploadProgress(10);

  const reader = new FileReader();
  let chunks = [];
  let offset = 0;

  reader.onload = (e) => {
    chunks.push(e.target.result);
    offset += chunkSize;
    if (offset < file.size) {
      readNextChunk();
    } else {
      setUploadProgress(50);
      generateQRs(chunks, totalChunks, file.name, file.type);
    }
  };

  const readNextChunk = () => {
    const slice = file.slice(offset, offset + chunkSize);
    reader.readAsArrayBuffer(slice);
  };

  readNextChunk();

  function generateQRs(chunks, totalChunks, fileName, fileType) {
    let currentChunk = 0;
    const interval = setInterval(() => {
      if (currentChunk < totalChunks) {
        const chunkData = chunks[currentChunk];
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(chunkData)));
        const qrData = {
          chunk: currentChunk,
          total: totalChunks,
          data: base64Data,
          name: fileName.substring(0, 50),
          type: fileType
        };
        const jsonData = JSON.stringify(qrData);
        console.log(`Chunk ${currentChunk} JSON length: ${jsonData.length}`);
        if (jsonData.length < 2953) {
          let qrContainer = document.getElementById('qr-container');
          if (!qrContainer) {
            qrContainer = document.createElement('div');
            qrContainer.id = 'qr-container';
            qrContainer.style.display = 'none';
            document.body.appendChild(qrContainer);
          }
          qrContainer.innerHTML = '';
          new window.QRCode(qrContainer, {
            text: jsonData,
            width: 300,
            height: 300,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: window.QRCode.CorrectLevel.H
          });
          setTimeout(() => {
            const canvas = qrContainer.querySelector('canvas');
            if (canvas) {
              setQrCode(canvas.toDataURL());
            } else {
              console.error("QR canvas not found");
              showNotification('Failed to generate QR code.', 'error');
            }
          }, 500); // Increased timeout to ensure QR renders
        } else {
          showNotification('Data too large for QR.', 'error');
          clearInterval(interval);
          setIsGenerating(false);
          setUploadProgress(0);
          setQrCode('');
        }
        currentChunk++;
        setUploadProgress(50 + (currentChunk / totalChunks) * 50);
      } else {
        clearInterval(interval);
        setIsGenerating(false);
        setQrCode('');
        showNotification('All chunks generated! Scan to receive.', 'success');
      }
    }, 2000);
  }
};

window.stopTransfer = (setIsGenerating, setUploadProgress, setQrCode, setUserMessage, showNotification) => {
  setIsGenerating(false);
  setUploadProgress(0);
  setQrCode('');
  setUserMessage('Transfer stopped.');
  showNotification('Transfer stopped.', 'info');
};