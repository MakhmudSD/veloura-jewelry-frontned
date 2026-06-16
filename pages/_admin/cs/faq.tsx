import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import withAdminLayout from '../../../libs/components/layout/LayoutAdmin';
import { useMutation, useQuery, useReactiveVar } from '@apollo/client';

import {
	Box,
	Button,
	InputAdornment,
	Stack,
	Select,
	MenuItem,
	OutlinedInput,
	TablePagination,
	Typography,
	Divider,
	List,
	ListItem,
	FormControl,
	TextField,
} from '@mui/material';

import { TabContext } from '@mui/lab';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import { FaqArticlesPanelList } from '../../../libs/components/admin/cs/FaqList';
import { GET_FAQS } from '../../../apollo/admin/query';
import { FaqCategory, FaqStatus } from '../../../libs/enums/faq.enum';
import { CREATE_FAQ, DELETE_FAQ, UPDATE_FAQ } from '../../../apollo/admin/mutation';
import { userVar } from '../../../apollo/store';
import router from 'next/router';
import { NotificationGroup, NotificationType } from '../../../libs/enums/notification.enum';
import { CreateNotificationInput } from '../../../libs/types/notification/notification';
import { CREATE_NOTIFICATION } from '../../../apollo/user/mutation';

const FaqArticles: NextPage = () => {
	const [anchorEl, setAnchorEl] = useState<[] | HTMLElement[]>([]);
	const [tab, setTab] = useState<'all' | 'active' | 'blocked' | 'deleted'>('all');
	const [searchInput, setSearchInput] = useState('');
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [formData, setFormData] = useState({
		question: '',
		answer: '',
		status: FaqStatus.ACTIVE,
		category: FaqCategory.GENERAL,
	});

	const [faqId, setFaqId] = useState<string | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [shouldOpenFormOnEdit, setShouldOpenFormOnEdit] = useState(false);
	const [createFaq] = useMutation(CREATE_FAQ);
	const [updateFaq] = useMutation(UPDATE_FAQ);
	const [deleteFaq] = useMutation(DELETE_FAQ);
	const [createNotification] = useMutation(CREATE_NOTIFICATION);

	const { refetch } = useQuery(GET_FAQS);
	const user = useReactiveVar(userVar);

	const { data, loading } = useQuery(GET_FAQS, {
		fetchPolicy: 'network-only',
	});

	useEffect(() => {
		if (shouldOpenFormOnEdit && faqId && data?.getAllFaqs) {
			const found = data.getAllFaqs.find((f: any) => f._id === faqId);
			if (found) {
				setFormData({
					question: found.question,
					answer: found.answer,
					status: found.status,
					category: found.category,
				});
				setShowForm(true);
				setShouldOpenFormOnEdit(false);
			}
		}
	}, [shouldOpenFormOnEdit, faqId, data?.getAllFaqs]);

	const handleDeleteFaq = async (id: string) => {
		const confirmed = window.confirm('Are you sure you want to delete this FAQ?');

		if (!confirmed) return;

		try {
			await deleteFaq({ variables: { id } });
			await refetch();
		} catch (err) {
			console.error('FAQ deletion failed:', err);
			alert('Failed to delete FAQ.');
		}
	};

	const handleTabChange = (value: 'all' | 'active' | 'blocked' | 'deleted') => {
		setTab(value);
		setPage(0);
	};

	const handleInput = (val: string) => setSearchInput(val);

	const handlePageChange = (_: any, newPage: number) => setPage(newPage);

	const handleRowsChange = (e: any) => {
		setRowsPerPage(parseInt(e.target.value, 10));
		setPage(0);
	};

	const notifyMember = async (input: CreateNotificationInput) => {
		try {
			await createNotification({ variables: { input } });
		} catch (_e) {}
	};

	const handleSubmitFaq = async () => {
		const { question, answer, status, category } = formData;

		if (!question.trim() || !answer.trim() || !user?._id) {
			alert('All fields are required.');
			return;
		}

		try {
			if (faqId) {
				await updateFaq({
					variables: {
						input: {
							_id: faqId,
							question,
							answer,
							status,
							category,
						},
					},
				});
			} else {
				await createFaq({
					variables: {
						input: {
							question,
							answer,
							status,
							category,
						},
					},
				});
			}

			setFormData({
				question: '',
				answer: '',
				status: FaqStatus.ACTIVE,
				category: FaqCategory.GENERAL,
			});
			setFaqId(null);
			setShowForm(false);
			router.replace('/_admin/cs/faq');
			await refetch();
			void notifyMember({
				notificationType: NotificationType.NOTICE,
				notificationGroup: NotificationGroup.NOTICE,
				notificationTitle: 'New FAQ',
				notificationDesc: 'A new FAQ entry has been published.',
				authorId: user._id,
				receiverId: user._id,
			});
		} catch (err) {
			console.error('FAQ submission failed:', err);
			alert('Failed to submit FAQ.');
		}
	};

	const faqs = data?.getAllFaqs || [];
	const filteredFaqs = faqs.filter((faq: any) => {
		if (tab === 'all') return true;
		if (tab === 'active') return faq.status === 'ACTIVE';
		if (tab === 'blocked') return faq.status === 'INACTIVE';
		if (tab === 'deleted') return faq.status === 'DELETED';
		return true;
	});
	const pagedFaqs = filteredFaqs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

	return (
		<Box component="div" className="content">
			<Box component="div" className="title flex_space">
				<Typography variant="h2">FAQ Management</Typography>
				<Button
					className="btn_add"
					variant="contained"
					size="medium"
					onClick={() => {
						router.replace('/_admin/cs/faq');
						setFormData({
							question: '',
							status: FaqStatus.ACTIVE,
							answer: '',
							category: FaqCategory.GENERAL,
						});
						setFaqId(null);
						setShowForm(!showForm);
					}}
					style={{ color: '#fff', backgroundColor: '#b97b2a', marginTop: '15px' }}
				>
					<AddRoundedIcon sx={{ mr: '8px' }} />
					{showForm ? 'CANCEL' : 'ADD'}
				</Button>

				{showForm && (
					<Box sx={{ p: 3, backgroundColor: '#f9f9f9', borderRadius: 2, mb: 3 }}>
						<Typography variant="h2" mb={2}>
							{faqId ? 'Edit FAQ' : 'Create New FAQ'}
						</Typography>
						<Stack spacing={2}>
							<FormControl fullWidth>
								<TextField
									label="Question"
									variant="outlined"
									value={formData.question}
									onChange={(e: any) => setFormData({ ...formData, question: e.target.value })}
								/>
							</FormControl>
							<FormControl fullWidth>
								<TextField
									label="Answer"
									variant="outlined"
									multiline
									rows={1}
									value={formData.answer}
									onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
								/>
							</FormControl>
							<FormControl fullWidth>
								<Select
									value={formData.status}
									onChange={(e) => setFormData({ ...formData, status: e.target.value as FaqStatus })}
								>
									<MenuItem value={FaqStatus.ACTIVE}>ACTIVE</MenuItem>
									<MenuItem value={FaqStatus.BLOCKED}>BLOCKED</MenuItem>
									<MenuItem value={FaqStatus.DELETED}>DELETED</MenuItem>
								</Select>
							</FormControl>
							<FormControl fullWidth>
								<Select
									value={formData.category}
									onChange={(e) => setFormData({ ...formData, category: e.target.value as FaqCategory })}
								>
									{Object.values(FaqCategory).map((cat) => (
										<MenuItem key={cat} value={cat}>
											{cat}
										</MenuItem>
									))}
								</Select>
							</FormControl>
							<Button variant="contained" onClick={handleSubmitFaq}>
								{faqId ? 'Update FAQ' : 'Submit FAQ'}
							</Button>
						</Stack>
					</Box>
				)}
			</Box>

			<Box component="div" className="table-wrap">
				<Box component="div" sx={{ width: '100%', typography: 'body1' }}>
					<TabContext value={tab}>
						<Box component="div">
							<List className="tab-menu">
								<ListItem onClick={() => handleTabChange('all')} className={tab === 'all' ? 'li on' : 'li'}>
									All ({faqs.length})
								</ListItem>
								<ListItem onClick={() => handleTabChange('active')} className={tab === 'active' ? 'li on' : 'li'}>
									Active ({faqs.filter((f: any) => f.status === 'ACTIVE').length})
								</ListItem>
								<ListItem onClick={() => handleTabChange('blocked')} className={tab === 'blocked' ? 'li on' : 'li'}>
									Blocked ({faqs.filter((f: any) => f.status === 'INACTIVE').length})
								</ListItem>
								<ListItem onClick={() => handleTabChange('deleted')} className={tab === 'deleted' ? 'li on' : 'li'}>
									Deleted ({faqs.filter((f: any) => f.status === 'DELETED').length})
								</ListItem>
							</List>
							<Divider />
							<Stack className="search-area" sx={{ m: '24px' }}>
								<Select sx={{ width: '160px', mr: '20px' }} value={'question'}>
									<MenuItem value={'question'}>Question</MenuItem>
									<MenuItem value={'answer'}>Answer</MenuItem>
								</Select>
								<OutlinedInput
									value={searchInput}
									onChange={(e) => handleInput(e.target.value)}
									sx={{ width: '100%' }}
									className="search"
									placeholder="Search question"
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
										}
									}}
									endAdornment={
										<>
											{searchInput && <CancelRoundedIcon onClick={() => handleInput('')} />}
											<InputAdornment position="end">
												<img src="/img/icons/search_icon.png" alt="searchIcon" />
											</InputAdornment>
										</>
									}
								/>
							</Stack>
							<Divider />
						</Box>

						<FaqArticlesPanelList
							faqs={pagedFaqs}
							loading={loading}
							anchorEl={anchorEl}
							onEditClick={(id: string) => {
								setFaqId(id);
								setShouldOpenFormOnEdit(true);
								router.replace('/_admin/cs/faq');
							}}
							onDeleteClick={handleDeleteFaq}
						/>

						<TablePagination
							rowsPerPageOptions={[20, 40, 60]}
							component="div"
							count={filteredFaqs.length}
							rowsPerPage={rowsPerPage}
							page={page}
							onPageChange={handlePageChange}
							onRowsPerPageChange={handleRowsChange}
						/>
					</TabContext>
				</Box>
			</Box>
		</Box>
	);
};

export default withAdminLayout(FaqArticles);
