import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryMyProductsDto } from './dto/query-my-products.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { ReviewProductDto } from './dto/review-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async getProducts(query: QueryProductsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.APPROVED,
      ...(query.category ? { category: query.category } : {}),
      ...(query.keyword
        ? {
            name: {
              contains: query.keyword,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          seller: {
            select: {
              id: true,
              username: true,
            },
          },
          _count: {
            select: {
              auctions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: { page, limit, total },
    };
  }

  async getProductById(productId: string, userId?: string, role?: Role) {
    const where: Prisma.ProductWhereInput = {
      id: productId,
      ...(userId
        ? {
            OR: [
              { status: ProductStatus.APPROVED },
              { sellerId: userId },
              ...(role === Role.ADMIN ? [{}] : []),
            ],
          }
        : { status: ProductStatus.APPROVED }),
    };

    const product = await this.prisma.product.findFirst({
      where,
      include: {
        seller: {
          select: {
            id: true,
            username: true,
          },
        },
        auctions: {
          select: {
            id: true,
            status: true,
            startPrice: true,
            currentPrice: true,
            startTime: true,
            endTime: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    return {
      ...product,
      auctions: product.auctions.map((auction) => ({
        ...auction,
        startPrice: Number(auction.startPrice),
        currentPrice: Number(auction.currentPrice),
      })),
    };
  }

  async getMyProducts(userId: string, role: Role, query: QueryMyProductsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      sellerId: userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.keyword
        ? {
            name: {
              contains: query.keyword,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              auctions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      sellerRole: role,
      products,
      pagination: { page, limit, total },
    };
  }

  async getAdminProducts(query: QueryMyProductsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.keyword
        ? {
            name: {
              contains: query.keyword,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          seller: {
            select: {
              id: true,
              username: true,
            },
          },
          _count: {
            select: {
              auctions: true,
            },
          },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: { page, limit, total },
    };
  }

  async getMyProductById(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        sellerId: userId,
      },
      include: {
        _count: {
          select: {
            auctions: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    return product;
  }

  async createProduct(userId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        sellerId: userId,
        name: dto.name,
        description: dto.description,
        images: dto.images,
        category: dto.category,
      },
    });
  }

  async updateProduct(userId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        _count: {
          select: {
            auctions: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }
    if (product.sellerId !== userId) {
      throw new ForbiddenException('无权修改此商品');
    }
    if (product.status !== ProductStatus.DRAFT && product.status !== ProductStatus.REJECTED) {
      throw new BadRequestException('只有草稿或驳回状态的商品允许修改');
    }
    if (product._count.auctions > 0) {
      throw new BadRequestException('已关联拍卖的商品不允许修改');
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: dto,
    });
  }

  async deleteProduct(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        _count: {
          select: {
            auctions: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }
    if (product.sellerId !== userId) {
      throw new ForbiddenException('无权删除此商品');
    }
    if (product._count.auctions > 0) {
      throw new BadRequestException('已关联拍卖的商品不允许删除');
    }
    if (product.status === ProductStatus.REVIEWING) {
      throw new BadRequestException('审核中的商品不允许删除');
    }

    await this.prisma.product.delete({
      where: { id: productId },
    });
  }

  async submitForReview(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }
    if (product.sellerId !== userId) {
      throw new ForbiddenException('无权提交此商品审核');
    }
    if (product.status !== ProductStatus.DRAFT && product.status !== ProductStatus.REJECTED) {
      throw new BadRequestException('当前商品状态不允许提交审核');
    }
    if (!product.images.length) {
      throw new BadRequestException('请至少上传一张商品图片后再提交审核');
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        status: ProductStatus.REVIEWING,
        reviewNote: null,
        reviewedAt: null,
        reviewedBy: null,
      },
    });
  }

  async reviewProduct(operatorId: string, productId: string, dto: ReviewProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }
    if (product.status !== ProductStatus.REVIEWING) {
      throw new BadRequestException('只有审核中的商品可以执行审核操作');
    }

    const reviewedAt = new Date();
    const updatedProduct = await this.prisma.$transaction(async (tx) => {
      const result = await tx.product.update({
        where: { id: productId },
        data: {
          status: dto.status,
          reviewNote: dto.reviewNote ?? null,
          reviewedAt,
          reviewedBy: operatorId,
        },
      });

      await tx.auditLog.create({
        data: {
          targetType: 'PRODUCT',
          targetId: productId,
          action: dto.status === ProductStatus.APPROVED ? 'APPROVE' : 'REJECT',
          reason: dto.reviewNote,
          operatorId,
        },
      });

      return result;
    });

    return updatedProduct;
  }

  async getCategories() {
    const categories = await this.prisma.product.findMany({
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });

    return categories.map((item) => item.category);
  }

  async addProductImages(userId: string, productId: string, images: string[]) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        _count: {
          select: {
            auctions: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }
    if (product.sellerId !== userId) {
      throw new ForbiddenException('无权修改此商品图片');
    }
    if (product.status !== ProductStatus.DRAFT && product.status !== ProductStatus.REJECTED) {
      throw new BadRequestException('只有草稿或驳回状态的商品允许修改图片');
    }
    if (product._count.auctions > 0) {
      throw new BadRequestException('已关联拍卖的商品不允许修改图片');
    }

    const mergedImages = [...new Set([...product.images, ...images])];

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        images: mergedImages,
      },
    });
  }

  async removeProductImage(userId: string, productId: string, imageId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        _count: {
          select: {
            auctions: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }
    if (product.sellerId !== userId) {
      throw new ForbiddenException('无权删除此商品图片');
    }
    if (product.status !== ProductStatus.DRAFT && product.status !== ProductStatus.REJECTED) {
      throw new BadRequestException('只有草稿或驳回状态的商品允许修改图片');
    }
    if (product._count.auctions > 0) {
      throw new BadRequestException('已关联拍卖的商品不允许修改图片');
    }

    if (!product.images.includes(imageId)) {
      throw new NotFoundException('图片不存在');
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        images: product.images.filter((image) => image !== imageId),
      },
    });
  }
}
