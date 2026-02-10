import { redirect } from 'next/navigation';

export default function CocpSuperVip10Redirect() {
  redirect('/checkout?plan=mensal&paymentMethod=2&coupon=SUPERVIP10');
}
