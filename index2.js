        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        // --- 1. HANDLE FILE INPUTS (Drag & Drop + Click) ---
        function setupInput(dropZoneId, fileInputId, previewId) {
            const dropZone = document.getElementById(dropZoneId);
            const fileInput = document.getElementById(fileInputId);
            const preview = document.getElementById(previewId);
            const defaultText = dropZone.querySelector('p');

            fileInput.addEventListener('change', (e) => loadFile(e.target.files[0], preview, defaultText));

            // Drag Events
            dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = '#fff'; });
            dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.style.borderColor = ''; });
            dropZone.addEventListener('drop', (e) => { 
                e.preventDefault(); 
                dropZone.style.borderColor = ''; 
                loadFile(e.dataTransfer.files[0], preview, defaultText); 
            });
        }

        function loadFile(file, preview, textElement) {
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.src = e.target.result;
                    preview.classList.remove('hidden');
                    textElement.classList.add('hidden');
                };
                reader.readAsDataURL(file);
            }
        }

        setupInput('drop-zone-enc', 'file-enc', 'preview-enc');
        setupInput('drop-zone-dec', 'file-dec', 'preview-dec');


        // --- 2. ENCRYPTION HELPER (XOR Cipher for Passcode) ---
        // Simple encryption logic: Text + Password = Scrambled Text
        function xorEncrypt(text, pass) {
            if (!pass) return text;
            let result = '';
            for (let i = 0; i < text.length; i++) {
                result += String.fromCharCode(text.charCodeAt(i) ^ pass.charCodeAt(i % pass.length));
            }
            return result;
        }

        // --- 3. ENCODE FUNCTION ---
        function encodeImage() {
            const img = document.getElementById('preview-enc');
            const text = document.getElementById('message').value;
            const pass = document.getElementById('pass-enc').value;
            const status = document.getElementById('status-enc');

            if (!img.src || img.src === "") {
                status.innerHTML = "<span class='error'>⚠ Please upload an image first!</span>";
                return;
            }
            if (!text) {
                status.innerHTML = "<span class='error'>⚠ Enter a message to hide!</span>";
                return;
            }

            // Canvas Init
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;

            // 1. Encrypt Text with Password
            const encryptedText = xorEncrypt(text, pass);
            
            // 2. Add Binary Conversion + Terminator
            let binary = '';
            for (let i = 0; i < encryptedText.length; i++) {
                let bin = encryptedText.charCodeAt(i).toString(2).padStart(8, '0');
                binary += bin;
            }
            binary += "00000000"; // Null Terminator

            // Capacity Check
            if (binary.length > data.length / 4) {
                status.innerHTML = "<span class='error'>Text too long for this image!</span>";
                return;
            }

            // 3. Embed Bits (LSB Substitution)
            for (let i = 0; i < binary.length; i++) {
                let pixel = data[i * 4]; // Modify Red Channel
                if (binary[i] === '1') {
                    pixel = (pixel | 1);
                } else {
                    pixel = (pixel & ~1);
                }
                data[i * 4] = pixel;
            }

            ctx.putImageData(imgData, 0, 0);

            // 4. Generate Output
            const outputURL = canvas.toDataURL('image/png');
            const downloadLink = document.getElementById('download-link');
            downloadLink.href = outputURL;
            downloadLink.download = "secure_stegano.png";
            downloadLink.classList.remove('hidden');
            
            status.innerHTML = "<span class='success'>✔ Data Locked & Encrypted! Download Now.</span>";
        }

        // --- 4. DECODE FUNCTION ---
        function decodeImage() {
            const img = document.getElementById('preview-dec');
            const pass = document.getElementById('pass-dec').value;
            const status = document.getElementById('status-dec');
            const resultArea = document.getElementById('result-area');

            if (!img.src || img.src === "") {
                status.innerHTML = "<span class='error'>⚠ Upload an encoded image!</span>";
                return;
            }

            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);

            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let binary = '';
            let finalMsg = '';

            // Extract Bits
            for (let i = 0; i < data.length; i += 4) {
                binary += (data[i] & 1);
            }

            // Convert Binary to Text
            let rawText = '';
            for (let i = 0; i < binary.length; i += 8) {
                const byte = binary.slice(i, i + 8);
                const charCode = parseInt(byte, 2);
                if (charCode === 0) break; // Stop at terminator
                rawText += String.fromCharCode(charCode);
            }

            try {
                // Decrypt with Password
                finalMsg = xorEncrypt(rawText, pass);
                
                // Show Result
                document.getElementById('decoded-msg').innerText = finalMsg;
                resultArea.classList.remove('hidden');
                status.innerHTML = "<span class='success'>✔ Extraction Complete</span>";
            } catch (e) {
                status.innerHTML = "<span class='error'>⚠ Failed to decode (Wrong Password?)</span>";
            }
        }