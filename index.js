const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const { file } = req;
        const { url: fileUrl } = req.body;
        let finalUrl;

        if (file) {
            const originalName = file.originalname;
            const filePath = path.join(__dirname, 'uploads', originalName);
            fs.renameSync(file.path, filePath);

            const instance = axios.create({
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
                baseURL: 'https://www.cjoint.com/',
            });
            const uploadUrl = await getUploadUrl(instance);
            const uploadResponse = await uploadFile(filePath, uploadUrl, instance);
            const cjointLink = await getCjointLink(uploadResponse);
            finalUrl = await getFinalUrl(cjointLink);

            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error('Error deleting file:', err);
                } else {
                    console.log('File deleted successfully');
                }
            });
        } else if (fileUrl) {
            const fileName = path.basename(fileUrl);
            const outputFilePath = path.join(__dirname, 'uploads', fileName);
            await downloadFile(fileUrl, outputFilePath);

            const instance = axios.create({
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
                baseURL: 'https://www.cjoint.com/',
            });
            const uploadUrl = await getUploadUrl(instance);
            const uploadResponse = await uploadFile(outputFilePath, uploadUrl, instance);
            const cjointLink = await getCjointLink(uploadResponse);
            finalUrl = await getFinalUrl(cjointLink);

            fs.unlink(outputFilePath, (err) => {
                if (err) {
                    console.error('Error deleting file:', err);
                } else {
                    console.log('File deleted successfully');
                }
            });
        } else {
            res.status(400).json({ error: 'No file or URL provided' });
            return;
        }

        const jsonResponse = {
            Successfully: {
                url: finalUrl,
                src: file ? file.originalname : path.basename(fileUrl),
                status: 'Success'
            }
        };

        res.json(jsonResponse);
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).send('Error processing file');
    }
});

app.get('/api/upload', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'No URL provided' });
    }

    try {
        const fileName = path.basename(url);
        const outputFilePath = path.join(__dirname, 'uploads', fileName);
        await downloadFile(url, outputFilePath);

        const instance = axios.create({
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            baseURL: 'https://www.cjoint.com/',
        });
        const uploadUrl = await getUploadUrl(instance);
        const uploadResponse = await uploadFile(outputFilePath, uploadUrl, instance);
        const cjointLink = await getCjointLink(uploadResponse);
        const finalUrl = await getFinalUrl(cjointLink);

        fs.unlink(outputFilePath, (err) => {
            if (err) {
                console.error('Error deleting file:', err);
            } else {
                console.log('File deleted successfully');
            }
        });

        res.json({ url: finalUrl });
    } catch (error) {
        console.error('Error processing URL:', error);
        res.status(500).send('Error processing URL');
    }
});

async function getUploadUrl(instance) {
    const response = await instance.get('/');
    const $ = cheerio.load(response.data);
    return $('#form-upload').attr('action');
}

async function downloadFile(url, outputPath) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(outputPath, Buffer.from(response.data, 'binary'));
}

async function uploadFile(filePath, uploadUrl, instance) {
    const formData = new FormData();
    formData.append('USERFILE', fs.createReadStream(filePath));

    const response = await instance.post(uploadUrl, formData, {
        headers: formData.getHeaders(),
    });
    return response.data;
}

async function getCjointLink(uploadResponse) {
    const $ = cheerio.load(uploadResponse);
    const link = $('.share_url a').attr('href');
    return link;
}

async function getFinalUrl(cjointLink) {
    const instance = axios.create({
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        baseURL: cjointLink,
    });

    try {
        const htmlResponse = await instance.get('/');
        const html$ = cheerio.load(htmlResponse.data);
        const shareUrl = html$('.share_url a').attr('href');
        const finalUrl = `https://www.cjoint.com${shareUrl.split('"')[0]}`;
        return finalUrl;
    } catch (error) {
        console.error('Error getting final URL:', error);
        throw error;
    }
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
