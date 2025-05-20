// middleware/imageMiddleware.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

const optimizeImage = async (req, res, next) => {
    if (!req.files) return next();

    try {
        const optimizedFiles = await Promise.all(
            req.files.map(async (file) => {
                const optimizedFilename = `optimized-${file.filename}`;
                const outputPath = path.join('public/uploads/events', optimizedFilename);

                await sharp(file.path)
                    .resize(1200, null, { // 최대 너비 1200px
                        withoutEnlargement: true,
                        fit: 'inside'
                    })
                    .jpeg({ 
                        quality: 80, // JPEG 품질 80%
                        progressive: true
                    })
                    .toFile(outputPath);

                // 원본 파일 삭제
                await fs.unlink(file.path);

                // 최적화된 파일 정보로 업데이트
                file.filename = optimizedFilename;
                file.path = outputPath;
                return file;
            })
        );

        req.files = optimizedFiles;
        next();
    } catch (error) {
        console.error('이미지 최적화 중 오류:', error);
        next(error);
    }
};

module.exports = optimizeImage;