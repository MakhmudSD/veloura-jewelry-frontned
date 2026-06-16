import React, { useState, useEffect } from 'react';
import {
  Box, Button, InputAdornment, Stack, Typography, Divider,
  List, ListItem, Select, MenuItem, OutlinedInput, TablePagination, TextField, FormControl
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import { TabContext } from '@mui/lab';
import { useMutation, useQuery, useReactiveVar } from '@apollo/client';
import { useRouter } from 'next/router';
import { userVar } from '../../../apollo/store';
import {  NoticeStatus } from '../../../libs/enums/notice.enum';
import { GET_NOTICES } from '../../../apollo/admin/query';
import { CREATE_NOTICE, UPDATE_NOTICE } from '../../../apollo/admin/mutation';
import NoticeList from '../../../libs/components/admin/cs/NoticeList';
import withAdminLayout from '../../../libs/components/layout/LayoutAdmin';
import { NoticeInquiry } from '../../../libs/types/notice/notice.input';
import { T } from '../../../libs/types/common';
import { Direction } from '../../../libs/enums/common.enum';
import { CREATE_NOTIFICATION } from '../../../apollo/user/mutation';
import { NotificationGroup, NotificationType } from '../../../libs/enums/notification.enum';
import { CreateNotificationInput } from '../../../libs/types/notification/notification';

const AdminNotice: React.FC = () => {
  const router = useRouter();
  const user = useReactiveVar(userVar);
  const noticeId = router.query.id as string | undefined;

  const defaultInquiry: NoticeInquiry = {
    page: 1,
    limit: 10,
    sort: 'createdAt',
    direction: Direction.DESC,
    search: {},
  };

  const [noticeInquiry, setNoticeInquiry] = useState<NoticeInquiry>(defaultInquiry);
  const [noticeTotal, setNoticeTotal] = useState<number>(0);
  const [searchInput, setSearchInput] = useState('');
  const [tabValue, setTabValue] = useState<'ALL' | NoticeStatus>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [shouldOpenFormOnEdit, setShouldOpenFormOnEdit] = useState(false);
  const [formData, setFormData] = useState({
    noticeTitle: '',
    noticeContent: '',
  });

  const [createNotice] = useMutation(CREATE_NOTICE);
  const [updateNotice] = useMutation(UPDATE_NOTICE);
  const [createNotification] = useMutation(CREATE_NOTIFICATION);



  const { loading, data, refetch } = useQuery(GET_NOTICES, {
    fetchPolicy: 'network-only',
    variables: { input: noticeInquiry },
    notifyOnNetworkStatusChange: true,
    onCompleted: (data: T) => {
      setNoticeTotal(data?.getNotices?.metaCounter?.[0]?.total ?? 0);
    },
  });

  useEffect(() => {
    refetch({ input: noticeInquiry });
  }, [noticeInquiry]);

  useEffect(() => {
    if (shouldOpenFormOnEdit && noticeId && data?.getNotices?.list) {
      const found = data.getNotices.list.find((n: any) => n._id === noticeId);
      if (found) {
        setFormData({
          noticeTitle: found.noticeTitle,
          noticeContent: found.noticeContent,
        });
        setShowForm(true);
        setShouldOpenFormOnEdit(false);
      }
    }
  }, [shouldOpenFormOnEdit, noticeId, data?.getNotices?.list]);

  const tabChangeHandler = (_: any, value: 'ALL' | NoticeStatus) => {
    setTabValue(value);
    const updatedInquiry = { ...noticeInquiry, page: 1 };
    if (value === 'ALL') {
      delete updatedInquiry.search?.noticeStatus;
    } else {
      updatedInquiry.search = {
        ...updatedInquiry.search,
        noticeStatus: value,
      };
    }
    setNoticeInquiry(updatedInquiry);
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    const search = { ...noticeInquiry.search, noticeTitle: value };
    const updatedInquiry = { ...noticeInquiry, search, page: 1 };
    setNoticeInquiry(updatedInquiry);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    const updatedInquiry = { ...noticeInquiry, search: {}, page: 1 };
    setNoticeInquiry(updatedInquiry);
  };

    const notifyMember = async (input: CreateNotificationInput) => {
      try {
        await createNotification({ variables: { input } });
      } catch (_e) {}
    };

  const handleSubmitNotice = async () => {
    const { noticeTitle, noticeContent } = formData;
    if (!noticeTitle.trim() || !noticeContent.trim() || !user?._id) {
      alert('All fields are required.');
      return;
    }
    try {
      if (noticeId) {
        await updateNotice({
          variables: {
            input: {
              _id: noticeId,
              noticeTitle,
              noticeContent,
              noticeStatus: NoticeStatus.ACTIVE,
            },
          },
        });
      } else {
        await createNotice({
          variables: {
            input: {
              noticeTitle,
              noticeContent,
              memberId: user._id,
              noticeStatus: NoticeStatus.ACTIVE,
            },
          },
        });
      }
      setFormData({ noticeTitle: '', noticeContent: '' });
      setShowForm(false);
      router.replace('/_admin/cs/notice');
      await refetch({ input: noticeInquiry });
      void notifyMember({
        notificationType: NotificationType.NOTICE,
        notificationGroup: NotificationGroup.NOTICE,
        notificationTitle: 'New Notice',
        notificationDesc: 'A new announcement has been published.',
        authorId: user._id,
        receiverId: user._id,
      });
    } catch (err) {
      console.error('Submit failed:', err);
      alert('Failed to submit notice.');
    }
  };

  return (
    <Box className="content">
      <Box className="title flex_space">
        <Typography variant="h2">Notice Management</Typography>
        <Button
          className="btn_add"
          variant="contained"
          size="medium"
          onClick={() => {
            router.replace('/_admin/cs/notice');
            setFormData({ noticeTitle: '', noticeContent: '' });
            setShowForm(!showForm);
          }}
          style={{ color: '#fff', backgroundColor: '#b97b2a', marginTop: '15px' }}
        >
          <AddRoundedIcon sx={{ mr: '8px' }} />
          {showForm ? 'CANCEL' : 'ADD'}
        </Button>
      </Box>

      {showForm && (
        <Box sx={{ p: 3, backgroundColor: '#f9f9f9', borderRadius: 2, mb: 3 }}>
          <Typography variant="h2" mb={2}>
            {noticeId ? 'Edit Notice' : 'Create New Notice'}
          </Typography>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <TextField
                label="Notice Title"
                variant="outlined"
                value={formData.noticeTitle}
                onChange={(e) => setFormData({ ...formData, noticeTitle: e.target.value })}
              />
            </FormControl>
            <FormControl fullWidth>
              <TextField
                label="Notice Content"
                variant="outlined"
                multiline
                rows={1}
                value={formData.noticeContent}
                onChange={(e) => setFormData({ ...formData, noticeContent: e.target.value })}
              />
            </FormControl>
            <Button variant="contained" onClick={handleSubmitNotice}>
              {noticeId ? 'Update Notice' : 'Submit Notice'}
            </Button>
          </Stack>
        </Box>
      )}

      <Box className="table-wrap">
        <TabContext value={tabValue}>
          <Box>
            <List className={'tab-menu'}>
              <ListItem value="ALL" className={tabValue === 'ALL' ? 'li on' : 'li'} onClick={(e: any) => tabChangeHandler(e, 'ALL')}>All</ListItem>
              <ListItem value="ACTIVE" className={tabValue === 'ACTIVE' ? 'li on' : 'li'} onClick={(e: any) => tabChangeHandler(e, NoticeStatus.ACTIVE)}>Active</ListItem>
              <ListItem value="BLOCKED" className={tabValue === 'BLOCKED' ? 'li on' : 'li'} onClick={(e: any) => tabChangeHandler(e, NoticeStatus.BLOCKED)}>Blocked</ListItem>
              <ListItem value="DELETED" className={tabValue === 'DELETED' ? 'li on' : 'li'} onClick={(e: any) => tabChangeHandler(e, NoticeStatus.DELETED)}>Deleted</ListItem>
            </List>
            <Divider />
            <Stack className="search-area" sx={{ m: '24px' }}>
              <OutlinedInput
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search notice"
                endAdornment={
                  <>
                    {searchInput && (
                      <CancelRoundedIcon sx={{ cursor: 'pointer', mr: 1 }} onClick={handleClearSearch} />
                    )}
                    <InputAdornment position="end" onClick={() => refetch({ input: noticeInquiry })}>
                      <img src="/img/icons/search_icon.png" alt="searchIcon" />
                    </InputAdornment>
                  </>
                }
              />
            </Stack>
            <Divider />
          </Box>

          <NoticeList
            notices={data?.getNotices?.list || []}
            loading={loading}
            page={noticeInquiry.page}
            limit={noticeInquiry.limit}
            refetch={() => refetch({ input: noticeInquiry })}
            onEditClick={(id) => {
              router.push({ pathname: '/_admin/cs/notice', query: { id } }, undefined, { shallow: true });
              setShouldOpenFormOnEdit(true);
              setShowForm(true);
            }}
          />

          <TablePagination
            rowsPerPageOptions={[10, 20, 40]}
            component="div"
            count={noticeTotal}
            rowsPerPage={noticeInquiry.limit}
            page={noticeInquiry.page - 1}
            onPageChange={(_: any, newPage: any) => {
              const updated = { ...noticeInquiry, page: newPage + 1 };
              setNoticeInquiry(updated);
              refetch({ input: updated });
            }}
            onRowsPerPageChange={(e: any) => {
              const limit = parseInt(e.target.value, 10);
              const updated = { ...noticeInquiry, page: 1, limit };
              setNoticeInquiry(updated);
              refetch({ input: updated });
            }}
          />
        </TabContext>
      </Box>
    </Box>
  );
};

export default withAdminLayout(AdminNotice);