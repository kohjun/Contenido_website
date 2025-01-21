// middleware/imageMiddleware.js
const sharp = require('sharp');
const path = require('path');

const optimizeImage = async (req, res, next) => {
    if (!req.file) return next();

    try {
        const image = sharp(req.file.path);
        const metadata = await image.metadata();

        // 이미지가 너무 큰 경우 리사이징
        if (metadata.width > 1200) {
            await image
                .resize(1200, null, {
                    withoutEnlargement: true,
                    fit: 'inside'
                })
                .jpeg({ quality: 80 })
                .toFile(path.join(
                    'public/uploads/events',
                    'optimized-' + req.file.filename
                ));

            // 원본 파일명 업데이트
            req.file.filename = 'optimized-' + req.file.filename;
        }

        next();
    } catch (error) {
        console.error('Error optimizing image:', error);
        next(error);
    }
};

module.exports = optimizeImage;