import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductStatus, Role } from '@prisma/client';
import { IsArray, IsString } from 'class-validator';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, resolve } from 'path';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryMyProductsDto } from './dto/query-my-products.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { ReviewProductDto } from './dto/review-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductService } from './product.service';

class ProductImagesDto {
  @ApiProperty({
    description: '商品图片路径列表',
    example: ['/uploads/product-images/product-2.jpg'],
  })
  @IsArray({ message: '商品图片必须是数组' })
  @IsString({ each: true, message: '商品图片必须是字符串路径' })
  images: string[];
}

const productImageUploadDir = resolve(__dirname, '../../../../../uploads/product-images');

const ensureProductImageUploadDir = () => {
  if (!existsSync(productImageUploadDir)) {
    mkdirSync(productImageUploadDir, { recursive: true });
  }
};

@ApiTags('商品')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: '商品列表（仅公开已审核通过商品）' })
  async getProducts(@Query() query: QueryProductsDto) {
    return this.productService.getProducts(query);
  }

  @Get('categories')
  @ApiOperation({ summary: '商品分类列表' })
  async getCategories() {
    return this.productService.getCategories();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取卖家自己的商品列表' })
  @ApiQuery({ name: 'status', required: false, enum: ProductStatus })
  async getMyProducts(@GetUser() user: any, @Query() query: QueryMyProductsDto) {
    return this.productService.getMyProducts(user.id, user.role, query);
  }

  @Get('my/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取卖家自己的商品详情' })
  async getMyProductById(@GetUser() user: any, @Param('id') id: string) {
    return this.productService.getMyProductById(user.id, id);
  }

  @Get(':id')
  @ApiOperation({ summary: '商品详情（仅公开已审核通过商品）' })
  async getProductById(@Param('id') id: string) {
    return this.productService.getProductById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建商品' })
  async createProduct(@GetUser() user: any, @Body() dto: CreateProductDto) {
    return this.productService.createProduct(user.id, dto);
  }

  @Post('images/upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      fileFilter: (_req: unknown, file: { mimetype: string }, callback: Function) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(new BadRequestException('只能上传图片文件'), false);
          return;
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  @ApiOperation({ summary: '上传商品本地图片' })
  async uploadProductImages(
    @UploadedFiles()
    files: Array<{
      originalname: string;
      buffer: Buffer;
    }>,
  ) {
    if (!files?.length) {
      throw new BadRequestException('请至少选择一张图片');
    }

    ensureProductImageUploadDir();
    const images = files.map((file) => {
      const safeExt = extname(file.originalname).toLowerCase() || '.jpg';
      const filename = `product-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
      writeFileSync(resolve(productImageUploadDir, filename), file.buffer);
      return `/uploads/product-images/${filename}`;
    });

    return {
      images,
    };
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '追加商品图片' })
  async addProductImages(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: ProductImagesDto,
  ) {
    return this.productService.addProductImages(user.id, id, dto.images);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除商品图片' })
  async removeProductImage(
    @GetUser() user: any,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productService.removeProductImage(user.id, id, imageId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改商品' })
  async updateProduct(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.updateProduct(user.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除商品' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(@GetUser() user: any, @Param('id') id: string) {
    await this.productService.deleteProduct(user.id, id);
  }

  @Patch(':id/submit-review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '提交商品审核' })
  async submitForReview(@GetUser() user: any, @Param('id') id: string) {
    return this.productService.submitForReview(user.id, id);
  }

  @Patch(':id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '审核商品（管理员）' })
  async reviewProduct(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: ReviewProductDto,
  ) {
    return this.productService.reviewProduct(user.id, id, dto);
  }
}

@ApiTags('管理后台-商品')
@Controller('admin/products')
export class AdminProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '管理员获取商品列表' })
  @ApiQuery({ name: 'status', required: false, enum: ProductStatus })
  async getAdminProducts(@Query() query: QueryMyProductsDto) {
    return this.productService.getAdminProducts(query);
  }
}

@ApiTags('搜索')
@Controller('search')
export class ProductSearchController {
  constructor(private readonly productService: ProductService) {}

  @Get('products')
  @ApiOperation({ summary: '商品搜索' })
  async searchProducts(@Query() query: QueryProductsDto) {
    return this.productService.getProducts(query);
  }
}
