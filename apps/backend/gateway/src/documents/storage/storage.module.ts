import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DiskStorageService } from './disk-storage.service';
import { R2StorageService } from './r2-storage.service';
import { STORAGE_SERVICE, type StorageService } from './storage.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    DiskStorageService,
    {
      provide: STORAGE_SERVICE,
      useFactory: (config: ConfigService, disk: DiskStorageService): StorageService => {
        const accessKey = config.get<string>('CLOUDFLARE_R2_ACCESS_KEY');
        const secretKey = config.get<string>('CLOUDFLARE_R2_SECRET_KEY');
        const bucket = config.get<string>('CLOUDFLARE_R2_BUCKET_NAME');
        const endpoint = config.get<string>('CLOUDFLARE_R2_ENDPOINT');
        if (accessKey && secretKey && bucket && endpoint) {
          return new R2StorageService({ accessKey, secretKey, bucket, endpoint });
        }
        return disk;
      },
      inject: [ConfigService, DiskStorageService],
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
