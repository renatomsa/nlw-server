import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import fastifyMultipart from '@fastify/multipart';
import path from 'node:path';
import fs from 'node:fs';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import { randomUUID } from 'crypto';

const pump = promisify(pipeline);

export async function uploadVideoRoute(app: FastifyInstance) {
    app.register(fastifyMultipart, {
        limits: {
            fileSize: 1_048_576 * 25, // 25MB
        }
    });

    app.post('/videos', async (request, response) => {
        const data = await request.file()

        if (!data) {
            return response.status(400).send({
                error: 'Missing file input :O',
            });
        }

        const extension = path.extname(data.filename);

        if (extension !== '.mp3') {
            return response.status(400).send({
                error: 'Invalid file type, please upload an mp3 file',
            });
        }

        const fileBaseName = path.basename(data.filename, extension);
        const fileNameUpload = `${fileBaseName}-${randomUUID}${extension}`;
        const uploadDestination = path.resolve(__dirname, '../../tmp', fileNameUpload)

        await pump(data.file, fs.createWriteStream(uploadDestination));

        const video = await prisma.video.create({
            data: {
                name: data.filename,
                path: uploadDestination,
        }});

        return {
            video,
        };

    })

};
