/**
 * Orders Service
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus, PaymentStatus } from '@shared/entities/order.entity';
import { OrderItem } from '@shared/entities/order-item.entity';
import { OrderStatusHistory } from '@shared/entities/order-status-history.entity';
import { CartItem } from '@shared/entities/cart-item.entity';
import { Product } from '@shared/entities/product.entity';
import { DeliveryAddress } from '@shared/entities/delivery-address.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { LoggerService } from '@shared/logger/logger.service';
import { NotificationService } from '@shared/notifications/notification.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(OrderStatusHistory)
    private statusHistoryRepository: Repository<OrderStatusHistory>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(DeliveryAddress)
    private addressRepository: Repository<DeliveryAddress>,
    private dataSource: DataSource,
    private logger: LoggerService,
    private notificationService: NotificationService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async createOrder(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get user's cart
      const cartItems = await this.cartItemRepository.find({
        where: { userId },
        relations: ['product', 'variant'],
      });

      if (cartItems.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      // Verify delivery address
      const deliveryAddress = await this.addressRepository.findOne({
        where: { id: createOrderDto.deliveryAddressId, userId },
      });

      if (!deliveryAddress) {
        throw new NotFoundException(`Delivery address with ID ${createOrderDto.deliveryAddressId} not found`);
      }

      // Calculate totals
      let subtotal = 0;
      const orderItems: OrderItem[] = [];

      for (const cartItem of cartItems) {
        const product = cartItem.product;
        const unitPrice = cartItem.variant
          ? cartItem.variant.price
          : product.price;

        const totalPrice = unitPrice * cartItem.quantity;
        subtotal += totalPrice;

        // Create order item
        const orderItem = this.orderItemRepository.create({
          productId: product.id,
          variantId: cartItem.variantId,
          productName: product.name,
          productSku: cartItem.variant
            ? cartItem.variant.sku
            : product.sku,
          quantity: cartItem.quantity,
          unitPrice,
          totalPrice,
        });

        orderItems.push(orderItem);
      }

      const tax = subtotal * 0.21; // 21% VAT for Czech Republic
      const shippingCost = createOrderDto.shippingCost || 0;
      const discount = createOrderDto.discount || 0;
      const total = subtotal + tax + shippingCost - discount;

      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      // Create order
      const order = this.orderRepository.create({
        orderNumber,
        userId,
        deliveryAddressId: createOrderDto.deliveryAddressId,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: createOrderDto.paymentMethod || 'payu',
        subtotal,
        tax,
        shippingCost,
        discount,
        total,
        notes: createOrderDto.notes,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // Create order items
      for (const orderItem of orderItems) {
        orderItem.orderId = savedOrder.id;
        await queryRunner.manager.save(orderItem);
      }

      // Create status history
      const statusHistory = this.statusHistoryRepository.create({
        orderId: savedOrder.id,
        status: OrderStatus.PENDING,
        notes: 'Order created',
        changedBy: userId,
      });
      await queryRunner.manager.save(statusHistory);

      // Clear cart
      await queryRunner.manager.delete(CartItem, { userId });

      await queryRunner.commitTransaction();

      // Load full order with relations
      const fullOrder = await this.orderRepository.findOne({
        where: { id: savedOrder.id },
        relations: ['items', 'deliveryAddress', 'statusHistory'],
      });

      this.logger.log(`Order created: ${savedOrder.orderNumber}`, {
        orderId: savedOrder.id,
        userId,
        total: savedOrder.total,
      });

      // Send order confirmation notification (non-blocking)
      this.sendOrderConfirmationNotification(fullOrder!, deliveryAddress).catch(
        (error) => {
          this.logger.error('Failed to send order confirmation notification', {
            error: error.message,
            orderId: savedOrder.id,
          });
        },
      );

      return fullOrder!;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Order creation failed', { error: error.message, userId });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(userId?: string) {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.deliveryAddress', 'deliveryAddress')
      .orderBy('order.createdAt', 'DESC');

    if (userId) {
      queryBuilder.where('order.userId = :userId', { userId });
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string, userId?: string): Promise<Order> {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }

    const order = await this.orderRepository.findOne({
      where,
      relations: ['items', 'deliveryAddress', 'statusHistory', 'invoices', 'proformaInvoices'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    notes?: string,
    changedBy?: string,
  ): Promise<Order> {
    const order = await this.findOne(id);

    order.status = status;

    // Create status history
    const statusHistory = this.statusHistoryRepository.create({
      orderId: id,
      status,
      notes: notes || `Status changed to ${status}`,
      changedBy: changedBy || 'system',
    });
    await this.statusHistoryRepository.save(statusHistory);

    const updatedOrder = await this.orderRepository.save(order);

    this.logger.log(`Order status updated: ${id}`, {
      orderId: id,
      status,
    });

    // Send order status update notification (non-blocking)
    this.sendOrderStatusUpdateNotification(updatedOrder, status).catch(
      (error) => {
        this.logger.error('Failed to send order status update notification', {
          error: error.message,
          orderId: id,
        });
      },
    );

    return updatedOrder;
  }

  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
    transactionId?: string,
  ): Promise<Order> {
    const order = await this.findOne(id);

    order.paymentStatus = paymentStatus;
    if (transactionId) {
      order.paymentTransactionId = transactionId;
    }

    if (paymentStatus === PaymentStatus.PAID) {
      order.status = OrderStatus.CONFIRMED;
    }

    const updatedOrder = await this.orderRepository.save(order);

    this.logger.log(`Order payment status updated: ${id}`, {
      orderId: id,
      paymentStatus,
    });

    // Send payment confirmation notification when payment is confirmed (non-blocking)
    if (paymentStatus === PaymentStatus.PAID) {
      this.sendPaymentConfirmationNotification(updatedOrder).catch((error) => {
        this.logger.error('Failed to send payment confirmation notification', {
          error: error.message,
          orderId: id,
        });
      });
    }

    return updatedOrder;
  }

  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year + 1}-01-01`);

    const count = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.createdAt >= :start', { start: startOfYear })
      .andWhere('order.createdAt < :end', { end: endOfYear })
      .getCount();

    const orderNumber = `ORD-${year}-${String(count + 1).padStart(6, '0')}`;
    return orderNumber;
  }

  /**
   * Get user email from user service
   */
  private async getUserEmail(userId: string): Promise<string | null> {
    try {
      const userServiceUrl =
        this.configService.get<string>('USER_SERVICE_URL') || 'http://user-service:3004';
      const response = await firstValueFrom(
        this.httpService.get(`${userServiceUrl}/users/${userId}`, {
          timeout: 5000,
        }),
      );
      return response.data?.data?.email || null;
    } catch (error) {
      this.logger.warn('Failed to fetch user email from user service', {
        userId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Send order confirmation notification
   */
  private async sendOrderConfirmationNotification(
    order: Order,
    deliveryAddress: DeliveryAddress,
  ): Promise<void> {
    // Try to get email from user service
    let recipientEmail = (await this.getUserEmail(order.userId)) || null;

    if (!recipientEmail) {
      this.logger.warn('Cannot send order confirmation: no email found', {
        orderId: order.id,
        userId: order.userId,
      });
      return;
    }

    await this.notificationService.sendOrderConfirmation(
      recipientEmail,
      order.orderNumber,
      order.total,
      'email',
    );
  }

  /**
   * Send order status update notification
   */
  private async sendOrderStatusUpdateNotification(
    order: Order,
    status: OrderStatus,
  ): Promise<void> {
    const fullOrder = await this.findOne(order.id);
    const deliveryAddress = fullOrder.deliveryAddress;

    if (!deliveryAddress) {
      return;
    }

    // Try to get email from user service
    let recipientEmail = (await this.getUserEmail(order.userId)) || null;

    if (!recipientEmail) {
      return;
    }

    await this.notificationService.sendOrderStatusUpdate(
      recipientEmail,
      order.orderNumber,
      status,
      'email',
    );
  }

  /**
   * Send payment confirmation notification
   */
  private async sendPaymentConfirmationNotification(
    order: Order,
  ): Promise<void> {
    const fullOrder = await this.findOne(order.id);
    const deliveryAddress = fullOrder.deliveryAddress;

    if (!deliveryAddress) {
      return;
    }

    // Try to get email from user service
    let recipientEmail = (await this.getUserEmail(order.userId)) || null;

    if (!recipientEmail) {
      this.logger.warn('Cannot send payment confirmation: no email found', {
        orderId: order.id,
        userId: order.userId,
      });
      return;
    }

    await this.notificationService.sendPaymentConfirmation(
      recipientEmail,
      order.orderNumber,
      order.total,
      'email',
    );
  }
}

