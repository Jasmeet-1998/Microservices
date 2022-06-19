import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class Product{
    /**the decorator specifies
     * it is autogenerated
     * & it is primary key
     */
    @PrimaryGeneratedColumn()
    id:number;

    @Column()
    title: string;

    @Column()
    image: string;

    @Column({default: 0})
    likes: string;

}