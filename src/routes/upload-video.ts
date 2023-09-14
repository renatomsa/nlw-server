import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import fastifyMultipart from '@fastify/multipart';
import path from 'node:path';
import fs from 'node:fs';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { randomInt } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pump = promisify(pipeline);

export async function uploadVideoRoute(app: FastifyInstance) {
    app.register(fastifyMultipart, {
        limits: {
            fileSize: 1_048_576 * 25, // 25MB
        }
    });

    app.post('/videos', async (req, reply) => {
        const data = await req.file()

        if (!data) {
            return reply.status(400).send({
                error: 'Missing file input :O',
            });
        }

        const extension = path.extname(data.filename);

        if (extension !== '.mp3') {
            return reply.status(400).send({
                error: 'Invalid file type, please upload an mp3 file',
            });
        }

        const fileBaseName = path.basename(data.filename, extension);
        const fileNameUpload = `${fileBaseName}-${randomInt(1111111111111 - 999999999999)}${extension}`;
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
