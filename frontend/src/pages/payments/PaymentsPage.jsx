import OrdersManager from '../../components/common/OrdersManager';

export default function PaymentsPage({ notify }) {
  return <OrdersManager type="payments" notify={notify} />;
}
