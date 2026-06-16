import React, { useState } from 'react';
import { NextPage } from 'next';
import { Pagination, Stack, Typography, Button, LinearProgress, Box } from '@mui/material';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import { useMutation, useQuery, useReactiveVar } from '@apollo/client';
import { T } from '../../types/common';
import { userVar } from '../../../apollo/store';
import { useRouter } from 'next/router';
import { UPDATE_ORDER } from '../../../apollo/user/mutation';
import { GET_MY_ORDERS } from '../../../apollo/user/query';
import { sweetConfirmAlert, sweetErrorHandling, sweetTopSmallSuccessAlert } from '../../sweetAlert';
import { OrderInquiry } from '../../types/order/order.input';
import { Order } from '../../types/order/order';
import { OrderStatus } from '../../enums/order.enum';
import moment from 'moment';
import { resolveImageUrl } from '../../config';
import {useEffect} from 'react';

const money = (n?: number, currency?: string) =>
  typeof n === 'number' ? `${currency ? currency + ' ' : ''}${n.toLocaleString()}` : '';

const getItems = (order: any) => (order?.orderItems || order?.items || []) as any[];

const titleFromOrder = (order: any) => {
  const items = getItems(order);
  const firstName =
    items?.[0]?.productData?.productTitle ||
    items?.[0]?.productName ||
    order?._id ||
    '—';
  const extra = Math.max(0, (items?.length || 0) - 1);
  return extra > 0 ? `${firstName} +${extra}` : firstName;
};

const deriveDisplayStatus = (createdAt?: string | Date) => {
  if (!createdAt) return { label: 'Preparing', effective: OrderStatus.PAUSE, progress: 25 };
  const days = Math.max(0, moment().diff(moment(createdAt).startOf('day'), 'days'));
  if (days === 0) return { label: 'Preparing', effective: OrderStatus.PAUSE, progress: 30 };
  if (days === 1) return { label: 'On the way', effective: OrderStatus.PROCESS, progress: 70 };
  return { label: 'Arrived', effective: OrderStatus.FINISH, progress: 100 };
};

const MyOrders: NextPage = ({ initialInput }: any) => {
  const device = useDeviceDetect();
  const [searchFilter, setSearchFilter] = useState<OrderInquiry>(initialInput);
  const [orders, setOrders] = useState<Order[]>([]);
  const user = useReactiveVar(userVar);
  const router = useRouter();

  if (!user?._id || user?.memberType !== 'USER') {
    if (typeof window !== 'undefined') router.replace('/');
    return null;
  }

  /** APOLLO REQUESTS **/
  const [updateOrder] = useMutation(UPDATE_ORDER);

  const {
    loading: getOrdersLoading,
    data: getOrdersData,
    error: getOrdersError,
    refetch: getOrdersRefetch,
  } = useQuery(GET_MY_ORDERS, {
    fetchPolicy: 'network-only',
    variables: { input: searchFilter },
    notifyOnNetworkStatusChange: true,
  });

  useEffect(() => {
    if (getOrdersData?.getMyOrders) {
      setOrders(getOrdersData.getMyOrders);
    }
  }, [getOrdersData]);

  /** HANDLERS **/
  const paginationHandler = (e: T, value: number) => {
    setSearchFilter({ ...searchFilter, page: value });
  };

  const changeStatusHandler = (value: OrderStatus) => {
    setSearchFilter({ ...searchFilter, orderStatus: value, page: 1 });
  };

  const optimisticRemove = (id: string) => {
    const snapshot = orders;
    setOrders(prev => (prev || []).filter((o: any) => String(o?._id) !== String(id)));
    return snapshot;
  };

  const deleteOrderHandler = async (id: string) => {
    try {
      if (await sweetConfirmAlert('Are you sure you want to delete this order?')) {
        const snapshot = optimisticRemove(id);
        try {
          await updateOrder({ variables: { input: { orderId: id, orderStatus: OrderStatus.DELETE } } });
          await sweetTopSmallSuccessAlert('Order deleted successfully!');
          await getOrdersRefetch({ input: searchFilter }); 
        } catch (err: any) {
          setOrders(snapshot); 
          throw err;
        }
      }
    } catch (err: any) {
      await sweetErrorHandling(err);
    }
  };

  const cancelOrderHandler = async (id: string) => {
    try {
      if (await sweetConfirmAlert('Cancel this order?')) {
        const snapshot = optimisticRemove(id);
        try {
          await updateOrder({ variables: { input: { orderId: id, orderStatus: OrderStatus.CANCEL } } });
          await sweetTopSmallSuccessAlert('Order cancelled.');
          await getOrdersRefetch({ input: searchFilter }); 
        } catch (err: any) {
          setOrders(snapshot); 
          throw err;
        }
      }
    } catch (err: any) {
      await sweetErrorHandling(err);
    }
  };


  const EXCLUDED = new Set([OrderStatus.CANCEL, OrderStatus.DELETE]);

  const matchesActiveTab = (o: any) => {
    if (!o) return false;
    if (EXCLUDED.has(o?.orderStatus)) return false;

    const tab = searchFilter?.orderStatus;
    if (!tab) return true;

    const eff = deriveDisplayStatus(o?.createdAt).effective;

    if (tab === OrderStatus.PROCESS) {
      return (
        o?.orderStatus === OrderStatus.PROCESS ||
        o?.orderStatus === OrderStatus.PAUSE ||
        eff === OrderStatus.PROCESS ||
        eff === OrderStatus.PAUSE
      );
    }
    if (tab === OrderStatus.FINISH) {
      return o?.orderStatus === OrderStatus.FINISH || eff === OrderStatus.FINISH;
    }
    return o?.orderStatus === tab || eff === tab;
  };

  const filteredOrders = (orders || []).filter(matchesActiveTab);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / (searchFilter.limit || 1)));

  if (device === 'mobile') {
    return <div>VELOURA PRODUCTS MOBILE</div>;
  }

  return (
    <div id="my-order-page">
      <Stack className="main-title-box">
        <Stack className="right-box">
          <Typography className="main-title">My Orders</Typography>
          <Typography className="sub-title">We are glad to see you again!</Typography>
        </Stack>
      </Stack>

      <Stack className="order-list-box">
        {/* Tabs */}
        <Stack className="tab-name-box">
          <Typography
            onClick={() => changeStatusHandler(OrderStatus.PROCESS)}
            className={searchFilter.orderStatus === OrderStatus.PROCESS ? 'active-tab-name' : 'tab-name'}
          >
            On the way
          </Typography>
          <Typography
            onClick={() => changeStatusHandler(OrderStatus.FINISH)}
            className={searchFilter.orderStatus === OrderStatus.FINISH ? 'active-tab-name' : 'tab-name'}
          >
            Arrived
          </Typography>
        </Stack>

        <Stack className="list-box">
          {/* Headers: Order | Total | Status | Executed */}
          <Stack className="listing-title-box">
            <Typography className="title-text">Order</Typography>
            <Typography className="title-text">Total</Typography>
            <Typography className="title-text">Status</Typography>
            <Typography className="title-text">Order Executed</Typography>
          </Stack>

          {/* Rows */}
          {filteredOrders?.length === 0 ? (
            <div className={'no-data'}>
              <img src="/img/icons/icoAlert.svg" alt="" />
              <p>No order found!</p>
            </div>
          ) : (
            filteredOrders.map((order: any) => {
              const items = getItems(order);
              const executed = order?.createdAt ? moment(order.createdAt).format('YYYY-MM-DD HH:mm') : '—';
              const { label, effective, progress } = deriveDisplayStatus(order?.createdAt);

              const itemsTotal = items.reduce((sum: number, it: any) => {
                const price = typeof it?.itemPrice === 'number' ? it.itemPrice : 0;
                const qty = typeof it?.itemQuantity === 'number' ? it.itemQuantity : 0;
                return sum + price * qty;
              }, 0);
              const delivery = typeof order?.orderDelivery === 'number' ? order.orderDelivery : 0;
              const computedTotal = itemsTotal + delivery;
              const shownTotal = typeof order?.orderTotal === 'number' ? order.orderTotal : computedTotal;
              const totalLine = `Total: ${money(shownTotal, order?.currency)} (${money(itemsTotal, order?.currency)} + ${money(delivery, order?.currency)})`;

              return (
                <Stack key={order?._id} className="order-row">
                  {/* Column 1: Items */}
                  <Stack className="row-text">
                    <Typography>{titleFromOrder(order)}</Typography>

                    <Stack className="order-items-inline" sx={{ gap: 12, mt: 1 }}>
                      {items.map((it: any, idx: number) => {
                        const thumb = it?.productData?.productImages?.[0] || '/img/product/no-image.png';
                        const src = resolveImageUrl(thumb, '/img/product/no-image.png');
                        const title = it?.productData?.productTitle || '—';
                        const qty = it?.itemQuantity ?? 0;
                        const price = it?.itemPrice;

                        const goDetail = () =>
                          router.push({ pathname: '/product/detail', query: { id: it?.productId } });

                        return (
                          <Stack key={it?._id ?? `${order?._id}-${idx}`} direction="row" alignItems="center" className="order-item-row">
                            <Box
                              component="img"
                              src={src}
                              alt={title}
                              className="item-thumb"
                              onClick={goDetail}
                            />
                            <Stack className="item-info" onClick={goDetail}>
                              <Typography className="item-title" title={title}>
                                {title}
                              </Typography>
                              <Stack direction="row" className="item-meta">
                                <Typography className="item-qty">x{qty}</Typography>
                                <Typography className="item-price">{money(price, order?.currency)} =</Typography>
                                <Typography className="item-subtotal">
                                  {typeof price === 'number' ? money(price * qty, order?.currency) : ''}
                                </Typography>
                              </Stack>
                            </Stack>
                          </Stack>
                        );
                      })}
                    </Stack>
                  </Stack>

                  {/* Column 2: Total + actions */}
                  <Stack className="row-text total-actions" sx={{ gap: 8 }}>
                    <Typography className="total-line">{totalLine}</Typography>

                    <Stack direction="row" className="row-actions" spacing={1}>
                    {(effective === OrderStatus.PROCESS || effective === OrderStatus.PAUSE) && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => cancelOrderHandler(order?._id as string)}
                      >
                        Cancel
                      </Button>
                    )}

                      {/* Delete only in FINISH */}
                      {effective === OrderStatus.FINISH && (
                        <>
                          <Typography className="arrived-msg">Your order arrived</Typography>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => deleteOrderHandler(order?._id as string)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </Stack>
                  </Stack>

                  {/* Column 3: Status + progress */}
                  <Stack className="row-text status" sx={{ minWidth: 160 }}>
                    <Typography>{label}</Typography>
                    <LinearProgress variant="determinate" value={progress} sx={{ mt: 1 }} />
                  </Stack>

                  {/* Column 4: Executed (small) */}
                  <Typography className="row-text order-executed">
                    <span>{executed}</span>
                  </Typography>
                </Stack>
              );
            })
          )}

          {/* Pagination (centered) */}
          {filteredOrders.length !== 0 && (
            <Stack className="pagination-config">
              <Stack className="pagination-box">
                <Pagination
                  count={pageCount}
                  page={searchFilter.page}
                  shape="circular"
                  color="primary"
                  onChange={paginationHandler}
                />
              </Stack>
              <Stack className="total-result">
                <Typography>Showing {filteredOrders.length} orders</Typography>
              </Stack>
            </Stack>
          )}
        </Stack>
      </Stack>
    </div>
  );
};

MyOrders.defaultProps = {
  initialInput: {
    page: 1,
    limit: 5,
    orderStatus: 'PROCESS',
  },
};

export default MyOrders;
