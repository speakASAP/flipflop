/**
 * Analytics Service
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus, PaymentStatus } from '@shared/entities/order.entity';
import { OrderItem } from '@shared/entities/order-item.entity';
import { Product } from '@shared/entities/product.entity';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private logger: LoggerService,
  ) {}

  async getSalesData(startDate?: string, endDate?: string) {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .where('order.status != :status', { status: OrderStatus.CANCELLED })
      .andWhere('order.paymentStatus = :paymentStatus', {
        paymentStatus: PaymentStatus.PAID,
      });

    if (startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate });
    }

    const orders = await queryBuilder.getMany();

    const totalSales = orders.reduce((sum, order) => sum + parseFloat(order.total.toString()), 0);
    const orderCount = orders.length;
    const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0;

    return {
      totalSales,
      orderCount,
      averageOrderValue,
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };
  }

  async getRevenueData(startDate?: string, endDate?: string) {
    const salesData = await this.getSalesData(startDate, endDate);

    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.status != :status', { status: OrderStatus.CANCELLED })
      .andWhere('order.paymentStatus = :paymentStatus', {
        paymentStatus: PaymentStatus.PAID,
      });

    if (startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate });
    }

    const orders = await queryBuilder.getMany();

    // Calculate revenue by category, product, etc.
    const revenueByProduct: Record<string, number> = {};

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const productId = item.productId;
        revenueByProduct[productId] = (revenueByProduct[productId] || 0) + parseFloat(item.totalPrice.toString());
      });
    });

    return {
      totalRevenue: salesData.totalSales,
      revenueByProduct,
      orderCount: salesData.orderCount,
    };
  }

  async getProductAnalytics(productId?: string) {
    const queryBuilder = this.orderItemRepository
      .createQueryBuilder('orderItem')
      .leftJoinAndSelect('orderItem.order', 'order')
      .where('order.paymentStatus = :paymentStatus', {
        paymentStatus: PaymentStatus.PAID,
      });

    if (productId) {
      queryBuilder.andWhere('orderItem.productId = :productId', { productId });
    }

    const orderItems = await queryBuilder.getMany();

    const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalRevenue = orderItems.reduce(
      (sum, item) => sum + parseFloat(item.totalPrice.toString()),
      0,
    );

    return {
      productId: productId || 'all',
      totalQuantity,
      totalRevenue,
      orderCount: orderItems.length,
    };
  }

  async getMarginAnalysis(startDate?: string, endDate?: string) {
    const queryBuilder = this.orderItemRepository
      .createQueryBuilder('orderItem')
      .leftJoinAndSelect('orderItem.order', 'order')
      .where('order.paymentStatus = :paymentStatus', {
        paymentStatus: PaymentStatus.PAID,
      })
      .andWhere('order.status != :status', { status: OrderStatus.CANCELLED });

    if (startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate });
    }

    const orderItems = await queryBuilder.getMany();

    let totalRevenue = 0;
    let totalCost = 0;
    let totalMargin = 0;

    orderItems.forEach((item) => {
      const revenue = parseFloat(item.totalPrice.toString());
      const margin = item.profitMargin
        ? parseFloat(item.profitMargin.toString())
        : 0;
      const cost = revenue * (1 - margin / 100);

      totalRevenue += revenue;
      totalCost += cost;
      totalMargin += revenue - cost;
    });

    const marginPercentage = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      totalMargin,
      marginPercentage,
      orderItemCount: orderItems.length,
    };
  }
}

