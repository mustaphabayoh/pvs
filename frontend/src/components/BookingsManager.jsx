import React, { useEffect, useState } from 'react';
import {
	Box,
	Grid,
	Typography,
	Paper,
	Card,
	CardContent,
	CardActions,
	Button,
	TextField,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Chip,
	Stack,
	IconButton,
	Tooltip,
	ToggleButton,
	ToggleButtonGroup,
	FormControl,
	InputLabel,
	Select,
	MenuItem
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DoneAllIcon from '@mui/icons-material/DoneAll';

// Container types (shared with WishList)
const containerTypes = [
	'20ft Standard',
	'40ft Standard',
	'40ft High Cube',
	'45ft High Cube',
	'20ft Refrigerated',
	'40ft Refrigerated',
	'20ft Open Top',
	'40ft Open Top',
	'20ft Flat Rack',
	'40ft Flat Rack',
	'20ft Tank Container',
	'40ft Tank Container'
];

import Api from '../lib/api';

export default function BookingsManager({ token }) {
	const [payments, setPayments] = useState([]); // normalized verified + approved payments
	const [bookings, setBookings] = useState([]);
	const [importers, setImporters] = useState([]);
	const [loading, setLoading] = useState(false);
	const [selected, setSelected] = useState(null);
	const [openDialog, setOpenDialog] = useState(false);
	const [containersCsv, setContainersCsv] = useState('C1,C2');
	const [dialogBillOfLadingNumber, setDialogBillOfLadingNumber] = useState('');
	const [dialogNumberOfContainers, setDialogNumberOfContainers] = useState('');
	const [dialogContainersList, setDialogContainersList] = useState([]);
	const [dialogContainerEntry, setDialogContainerEntry] = useState('');
	const [paymentsView, setPaymentsView] = useState('cards'); // 'cards' | 'list'
	const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'bookings' | 'all'
	const [query, setQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState('');
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');
	
	const [sortBy, setSortBy] = useState('newest');
	const [selectedIds, setSelectedIds] = useState([]);
	const [expandedIds, setExpandedIds] = useState([]);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [previewItem, setPreviewItem] = useState(null);

	/* Booking form state removed */
	/* Dialog and side-panel create form removed per request */
	const [formContainerRows, setFormContainerRows] = useState([]); // kept for other logic if needed (empty by default)
	function normalizeEntry(e, kind = 'VERIFIED'){
		return {
			id: e.VerifiedID || e.PaymentID || `${kind}-${e.ReferenceNumber || Math.random()}`,
			kind,
			bank: e.BankName || e.bank_name,
			amount: e.Amount || e.amount,
			currency: e.CurrencyCode || e.currency_code || e.Currency || 'SLL',
			reference: e.ReferenceNumber || e.reference_number,
			importerName: e.Importer?.ImporterName || e.importer_name || e.importer || (e.ImporterName) || (e.ImporterID && `Importer ${e.ImporterID}`) || '',
			status: e.Status || e.status,
			date: e.PaymentDate || e.payment_date || e.CreatedAt || e.created_at || null,
			raw: e
		}
	}

	async function loadData(){
		console.log('BookingsManager: loadData token', token)
		setLoading(true);
		try{
			const [verifs = [], approvedPayments = [], bookingsResp = [], importersResp = []] = await Promise.all([
				Api.pendingVerifications(token).catch(()=>[]),
				Api.getPayments ? Api.getPayments(token, { status: 'APPROVED' }).catch(()=>[]) : Promise.resolve([]),
				Api.getBookings(token).catch(()=>[]),
				Api.importers ? Api.importers(token).catch(()=>[]) : Promise.resolve([])
			]);

			// Api.getPayments may return an object with .payments
			const approvedList = Array.isArray(approvedPayments) ? approvedPayments : (approvedPayments.payments || []);

			const norm = [];
			(verifs || []).forEach(v => { if(v.Status === 'VERIFIED' || v.Status === 'APPROVED') norm.push(normalizeEntry(v, 'VERIFIED')) });
			approvedList.forEach(p => { if(p.Status === 'APPROVED') norm.push(normalizeEntry(p, 'PAYMENT')) });

			// De-duplicate by id
			const map = new Map();
			norm.forEach(n => { map.set(n.id || `${n.kind}-${n.reference}`, n) });

			setPayments(Array.from(map.values()));
			setBookings(bookingsResp || []);
			setImporters(importersResp || []);
		}catch(err){ console.error(err) }
		setLoading(false);
	}

	useEffect(()=>{ loadData() }, [token]);

// Keep formContainerRows in sync with NumberOfContainers
useEffect(()=>{
	const n = parseNumberOfContainers(formNumberOfContainers);
	if(n <= 0) return;
	setFormContainerRows(prev => {
		if(prev.length === n) return prev;
		const next = Array.from({length: n}, (_, i) => prev[i] ? prev[i] : { container_number: '', container_type: '' });
		return next;
	});
}, [formNumberOfContainers]);

// Dialog counterpart
useEffect(()=>{
	const n = parseNumberOfContainers(dialogNumberOfContainers);
	if(n <= 0) return;
	setDialogContainerRows(prev => {
		if(prev.length === n) return prev;
		const next = Array.from({length: n}, (_, i) => prev[i] ? prev[i] : { container_number: '', container_type: '' });
		return next;
	});
}, [dialogNumberOfContainers]);

	function isBooked(p){
		if(!p) return false;
		return (bookings || []).some(b => {
			if(!b) return false;
			const vid = (b.verification_id || '').toString();
			if(!vid) return false;
			return vid === (p.id || '').toString() || vid === (p.reference || '').toString();
		});
	}

	const filteredPayments = payments.filter(p => {
		if(query){
			const q = query.toLowerCase();
			if(!(`${p.importerName} ${p.reference} ${p.bank} ${p.status}`.toLowerCase().includes(q))) return false;
		}
		if(statusFilter && p.status !== statusFilter) return false;
		if(dateFrom && p.date && new Date(p.date) < new Date(dateFrom)) return false;
		if(dateTo && p.date && new Date(p.date) > new Date(dateTo)) return false;
		return true;
	});

	// Sorting
	const sortedPayments = [...filteredPayments].sort((a,b)=>{
		if(sortBy === 'newest') return new Date(b.date || 0) - new Date(a.date || 0);
		if(sortBy === 'oldest') return new Date(a.date || 0) - new Date(b.date || 0);
		if(sortBy === 'amount_desc') return (b.amount || 0) - (a.amount || 0);
		if(sortBy === 'amount_asc') return (a.amount || 0) - (b.amount || 0);
		return 0;
	});

	const filteredBookings = bookings.filter(b => {
		if(query){
			const q = query.toLowerCase();
			const bookingText = `${b.id} ${b.document_type} ${b.status} ${b.verification_id}`;
			if(!bookingText.toLowerCase().includes(q)) return false;
		}
		if(statusFilter && b.status !== statusFilter) return false;
		if(dateFrom && b.created_at && new Date(b.created_at) < new Date(dateFrom)) return false;
		if(dateTo && b.created_at && new Date(b.created_at) > new Date(dateTo)) return false;
		return true;
	});

	const paymentsNotBooked = sortedPayments.filter(p => !isBooked(p));

// No mapping of payments to bookings—suggested bookings are not shown by design
const paymentsNotBookedMapped = [];

	const mergedBookings = filteredBookings; // Only persisted bookings are shown; no suggested items

	// Tabbed lists
	const pendingPayments = sortedPayments.filter(p => !isBooked(p));
	const bookedPayments = sortedPayments.filter(p => isBooked(p));
	const allPayments = sortedPayments;

	const displayPayments = activeTab === 'pending' ? pendingPayments : activeTab === 'bookings' ? bookedPayments : allPayments;

	function exportCSV(list){
		if(!Array.isArray(list)) return;
		const rows = list.map(p => ({
			Importer: p.importerName || '',
			Bank: p.bank || '',
			Reference: p.reference || '',
			Amount: p.amount || '',
			Currency: p.currency || '',
			Status: p.status || '',
			Date: p.date || ''
		}));
		const csv = [Object.keys(rows[0] || {}).join(','), ...rows.map(r => Object.values(r).map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'payments_export.csv';
		a.click();
		URL.revokeObjectURL(url);
	}

	function toggleSelectAll(checked){
		if(checked){
			setSelectedIds(displayPayments.map(p=>p.id));
		}else{
			setSelectedIds([]);
		}
	}

	function toggleSelectOne(id){
		setSelectedIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
	}

	/* Bulk create removed from Bookings Manager UI */

	/* handleOpenCreate removed - booking creation UI was removed */

	/* booking creation removed */


	return (
		<Box sx={{ p: 3 }}>
			{/* Header */}
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
				<Typography variant='h4' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<DoneAllIcon sx={{ color: '#1976d2' }} />
					Bookings Manager
				</Typography>
			</Box>

			{/* Tabs */}
			<Paper sx={{ width: '100%', mb: 3 }}>
				{/* emulate Verifications' Tabs */}
				<Box sx={{ px: 2 }}>
					<Button size="small" sx={{ mr: 1 }} onClick={()=>loadData()}>Refresh</Button>
					<ToggleButtonGroup size="small" value={activeTab} exclusive onChange={(_, v)=>v && setActiveTab(v)}>
						<ToggleButton value="pending">Pending ({pendingPayments.length})</ToggleButton>
						<ToggleButton value="bookings">Bookings ({mergedBookings.length})</ToggleButton>
						<ToggleButton value="all">All ({allPayments.length + bookings.length})</ToggleButton>
					</ToggleButtonGroup>
				</Box>
			</Paper>

			{/* Search & Filters */}
			<Paper sx={{ p: 2, mb: 3 }}>
				<Grid container spacing={2} alignItems="center">
					<Grid item xs={12} md={4}>
						<TextField fullWidth placeholder="Search by bank, reference, importer or booking id..." value={query} onChange={e=>setQuery(e.target.value)} InputProps={{ startAdornment: (<Box sx={{ mr: 1 }}><OpenInNewIcon/></Box>) }} />
					</Grid>
					<Grid item xs={12} md={3}>
						<FormControl fullWidth>
							<InputLabel>Filter By</InputLabel>
							<Select value={statusFilter} label="Filter By" onChange={e=>setStatusFilter(e.target.value)}>
								<MenuItem value="">All</MenuItem>
								<MenuItem value="PENDING">Pending</MenuItem>
								<MenuItem value="RELEASED">Released</MenuItem>
								<MenuItem value="CANCELLED">Cancelled</MenuItem>
							</Select>
						</FormControl>
					</Grid>
					<Grid item xs={12} md={3}>
						<FormControl fullWidth>
							<InputLabel>Sort By</InputLabel>
							<Select value={sortBy} label="Sort By" onChange={e=>setSortBy(e.target.value)}>
								<MenuItem value="newest">Date (Newest)</MenuItem>
								<MenuItem value="amount_desc">Amount (High-Low)</MenuItem>
								<MenuItem value="amount_asc">Amount (Low-High)</MenuItem>
							</Select>
						</FormControl>
					</Grid>
					<Grid item xs={12} md={2}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<ToggleButtonGroup size="small" value={paymentsView} exclusive onChange={(_, v)=>v && setPaymentsView(v)}>
								<ToggleButton value="cards">Cards</ToggleButton>
								<ToggleButton value="list">List</ToggleButton>
							</ToggleButtonGroup>
						</Box>
					</Grid>
					<Grid item xs={12}>
						<Typography variant="body2" color="textSecondary">Showing {displayPayments.length} of {allPayments.length} verified/approved payments</Typography>
					</Grid>
				</Grid>
			</Paper>

			{/* Main content + Booking form sidepanel */}
			<Grid container spacing={3}>
				<Grid item xs={12} md={8}>
					{/* Payments list/card area (kept largely the same but styled like verifications) */}
					<Paper sx={{ p: 2 }}>
						{paymentsView === 'cards' ? (
							<Grid container spacing={2}>
								{displayPayments.map(p => (
									<Grid item xs={12} sm={6} md={4} key={p.id}>
										<Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
											<CardContent sx={{ flexGrow: 1 }}>
												<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
													<Box sx={{ display: 'flex', alignItems: 'center' }}>
														<Typography variant="h6" noWrap>{p.reference}</Typography>
													</Box>
													<Chip label={p.status} color={p.status === 'APPROVED' ? 'success' : p.status === 'VERIFIED' ? 'info' : 'warning'} size="small" />
												</Box>
												<Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>{p.currency} {p.amount}</Typography>
												<Typography variant="body2" color="text.secondary">Bank: {p.bank}</Typography>
												<Typography variant="body2" color="text.secondary">Importer: {p.importerName}</Typography>
											</CardContent>
											<CardActions>
												<Tooltip title="Create bookings are only available from Manual Release or Duty Free pages">
										<span>
													</span>
									</Tooltip>
												<Button size="small" startIcon={<VisibilityIcon />} onClick={()=>{ setPreviewItem(p); setPreviewOpen(true) }}>Preview</Button>
											</CardActions>
										</Card>
									</Grid>
								))}
							</Grid>
						) : (
							<TableContainer>
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Importer</TableCell>
											<TableCell>Bank</TableCell>
											<TableCell>Reference</TableCell>
											<TableCell>Amount</TableCell>
											<TableCell>Status</TableCell>
												</TableRow>
									</TableHead>
									<TableBody>
										{displayPayments.map(p=> (
											<TableRow key={p.id}>
												<TableCell>{p.importerName}</TableCell>
												<TableCell>{p.bank}</TableCell>
												<TableCell>{p.reference}</TableCell>
												<TableCell>{p.amount} {p.currency}</TableCell>
												<TableCell><Chip label={p.status} size="small" color={p.status === 'APPROVED' ? 'success' : p.status === 'VERIFIED' ? 'info' : 'warning'} /></TableCell>
												<TableCell>
												<Tooltip title="Create bookings are only available from Manual Release or Duty Free pages">
													<span />
												</Tooltip>
											</TableCell>
										</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
						)}
					</Paper>
				</Grid>

			</Grid>

		</Box>
	);
}




