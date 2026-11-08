import OrdersManager from '../../components/common/OrdersManager';

export default function StitchingOrdersPage({ notify }) {
  return <OrdersManager type="stitching-orders" notify={notify} />;
}
