window.startTransfer = (file, setQrCode, setUploadProgress, setIsGenerating, setUserMessage, setFileMetadata, showNotification) => {
  setIsGenerating(true);
  setUploadProgress(0);
  setUserMessage(`Processing ${file.name} for transfer...`);

  const chunkSize = 2000; // Adjusted for 13 KB files with JSON overhead
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
        const qrData = {
          chunk: currentChunk,
          total: totalChunks,
          data: Array.from(new Uint8Array(chunkData)).slice(0, 1800), // Limit data to fit QR
          name: fileName.substring(0, 50), // Limit name length
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
            correctLevel: window.QRCode?.CorrectLevel?.H
          });
          setTimeout(() => {
            const canvas = qrContainer.querySelector('canvas');
            const img = qrContainer.querySelector('img');
            if (canvas) {
              setQrCode(canvas.toDataURL());
            } else if (img) {
              setQrCode(img.src);
            } else {
              console.log("No canvas or img found");
            }
          }, 100);
        } else {
          showNotification('Chunk too large for QR—adjusting chunk size.', 'error');
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