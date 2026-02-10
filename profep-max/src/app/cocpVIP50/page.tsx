import { redirect } from 'next/navigation';

export default function CocpVip50Redirect() {
  redirect('/checkout?plan=mensal&paymentMethod=2&coupon=VIP50');
}
