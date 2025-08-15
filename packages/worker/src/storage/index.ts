import { Storage } from '@calls-mvp/shared';
import { env } from '@calls-mvp/shared';
import fs from 'fs/promises';
import path from 'path';
import AWS from 'aws-sdk';

class DiskStorage implements Storage {
  base = path.join(process.cwd(), 'tmp');
  async put(key: string, data: Buffer, _contentType?: string) {
    const target = path.join(this.base, key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, data);
    return { key };
  }
  async get(key: string) {
    return fs.readFile(path.join(this.base, key));
  }
  async delete(key: string) {
    await fs.rm(path.join(this.base, key), { force: true });
  }
}

class S3Storage implements Storage {
  s3 = new AWS.S3({
    endpoint: env.s3.endpoint,
    s3ForcePathStyle: true,
    region: env.s3.region,
    accessKeyId: env.s3.accessKey,
    secretAccessKey: env.s3.secretKey
  });
  bucket = env.s3.bucket;
  async put(key: string, data: Buffer, contentType?: string) {
    await this.s3
      .putObject({ Bucket: this.bucket!, Key: key, Body: data, ContentType: contentType })
      .promise();
    return { key };
  }
  async get(key: string) {
    const r = await this.s3.getObject({ Bucket: this.bucket!, Key: key }).promise();
    return r.Body as Buffer;
  }
  async delete(key: string) {
    await this.s3.deleteObject({ Bucket: this.bucket!, Key: key }).promise();
  }
}

export async function createStorage(): Promise<Storage> {
  if (env.s3.endpoint && env.s3.bucket) return new S3Storage();
  return new DiskStorage();
}
