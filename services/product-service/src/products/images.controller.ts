/**
 * Images Controller
 * Handles product image upload endpoints
 */

import {
  Controller,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ImagesService } from './images.service';
import { ProductsService } from './products.service';
import { ApiResponseUtil } from '@shared/utils/api-response.util';
import { memoryStorage } from 'multer';

@Controller('products/:productId/images')
@UseGuards(AuthGuard('jwt'))
export class ImagesController {
  constructor(
    private readonly imagesService: ImagesService,
    private readonly productsService: ProductsService,
  ) {}

  /**
   * Upload main product image
   */
  @Post('main')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadMainImage(
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    // Verify product exists
    await this.productsService.findOne(productId);

    // Process and save image
    const imageUrl = await this.imagesService.processAndSaveImage(file, productId, true);

    // Update product with main image URL
    const product = await this.productsService.update(productId, {
      mainImageUrl: this.imagesService.getImageUrl(imageUrl),
    });

    return ApiResponseUtil.success({
      message: 'Main image uploaded successfully',
      imageUrl: product.mainImageUrl,
      product,
    });
  }

  /**
   * Upload additional product image
   */
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadImage(
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    // Verify product exists
    const product = await this.productsService.findOne(productId);

    // Process and save image
    const imageUrl = await this.imagesService.processAndSaveImage(file, productId, false);

    // Add to product's image URLs array
    const currentImageUrls = product.imageUrls || [];
    const fullImageUrl = this.imagesService.getImageUrl(imageUrl);
    const updatedImageUrls = [...currentImageUrls, fullImageUrl];

    // Update product
    const updatedProduct = await this.productsService.update(productId, {
      imageUrls: updatedImageUrls,
    });

    return ApiResponseUtil.success({
      message: 'Image uploaded successfully',
      imageUrl: fullImageUrl,
      product: updatedProduct,
    });
  }

  /**
   * Delete product image
   */
  @Delete(':imageUrl')
  async deleteImage(
    @Param('productId') productId: string,
    @Param('imageUrl') imageUrl: string,
  ) {
    // Verify product exists
    const product = await this.productsService.findOne(productId);

    // Decode URL parameter
    const decodedImageUrl = decodeURIComponent(imageUrl);

    // Remove from product's image URLs
    let updatedImageUrls = product.imageUrls || [];

    // Check if it's the main image
    if (product.mainImageUrl === decodedImageUrl) {
      await this.productsService.update(productId, { mainImageUrl: null });
    } else {
      // Remove from imageUrls array
      updatedImageUrls = updatedImageUrls.filter((url) => url !== decodedImageUrl);
      await this.productsService.update(productId, { imageUrls: updatedImageUrls });
    }

    // Delete file from disk
    await this.imagesService.deleteImage(decodedImageUrl);

    return ApiResponseUtil.success({
      message: 'Image deleted successfully',
    });
  }
}
