import OrdersManager from '../../components/common/OrdersManager';

export default function ReadymadeOrdersPage({ notify }) {
  return <OrdersManager type="readymade-orders" notify={notify} />;
}
