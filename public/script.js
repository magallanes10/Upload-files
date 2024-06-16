document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('upload-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData();
        const file = document.getElementById('file').files[0];
        const url = document.getElementById('url').value;

        if (file) {
            formData.append('file', file);
        }

        if (url) {
            formData.append('url', url);
        }

        document.getElementById('loading').style.display = 'block';

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();
            document.getElementById('loading').style.display = 'none';

            document.getElementById('result').style.display = 'block';

            const copyButton = document.getElementById('copy-button');
            copyButton.onclick = function () {
                navigator.clipboard.writeText(result.Successfully.url).then(function () {
                    copyButton.style.display = 'none';
                    const copySuccess = document.getElementById('copy-success');
                    copySuccess.style.display = 'block';
                    setTimeout(() => {
                        copySuccess.style.display = 'none';
                        copyButton.style.display = 'block';
                    }, 5000);
                });
            };
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('loading').style.display = 'none';
            alert('Error processing your request.');
        }
    });
});
