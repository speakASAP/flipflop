/**
 * Company Settings Entity
 * Stores company information for invoices and other business documents
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('company_settings')
export class CompanySettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, default: 'flipflop.statex.cz' })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  city!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postalCode!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ico!: string; // IČO (Company Registration Number)

  @Column({ type: 'varchar', length: 50, nullable: true })
  dic!: string; // DIČ (VAT Number)

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
