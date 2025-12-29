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
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Chip,
	Stack,
	IconButton,
	Avatar,
	Tooltip,
	TablePagination,
	ToggleButton,
	ToggleButtonGroup,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Checkbox,
	FormControlLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DeleteIcon from '@mui/icons-material/Delete';

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

	// Inline booking form state
	const [formImporterId, setFormImporterId] = useState('');
	const [formDocumentType, setFormDocumentType] = useState('STANDARD');
	const [formContainers, setFormContainers] = useState(''); // CSV fallback
	const [formContainersList, setFormContainersList] = useState([]); // individual containers
	const [formContainerEntry, setFormContainerEntry] = useState('');
	const [formBillOfLadingNumber, setFormBillOfLadingNumber] = useState('');
	const [formNumberOfContainers, setFormNumberOfContainers] = useState('');
	const [formVerificationId, setFormVerificationId] = useState('');
	const [extraManualBookings, setExtraManualBookings] = useState([]);
	const [extraDutyBookings, setExtraDutyBookings] = useState([]);

// Dynamic container rows when NumberOfContainers is specified
const [formContainerRows, setFormContainerRows] = useState([]); // { container_number, container_type }
const [dialogContainerRows, setDialogContainerRows] = useState([]);

// Parse NumberOfContainers like '3x20' -> 3, or '3' -> 3
function parseNumberOfContainers(str){
	if(!str) return 0;
	const s = String(str).trim();
	const match = s.match(/^(\d+)\s*(?:x.*)?$/i);
	if(match) return Number(match[1]);
	const n = parseInt(s, 10);
	return isNaN(n) ? 0 : n;
}
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
				Api.allVerifications(token).catch(()=>[]),
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

	async function handleBulkCreate(){
		if(selectedIds.length === 0) return;
		const toCreate = displayPayments.filter(p=> selectedIds.includes(p.id));
		const results = await Promise.allSettled(toCreate.map(p => Api.createBooking(token, { verification_id: p.id, document_type: 'STANDARD', containers: (p.raw && p.raw.DefaultContainers) || [] } )));
		const succeeded = results.filter(r=>r.status === 'fulfilled').length;
		const failed = results.length - succeeded;
		alert(`Bulk create: ${succeeded} created, ${failed} failed`);
		setSelectedIds([]);
		loadData();
	}

	async function handleOpenCreate(p){
		setSelected(p);
		setContainersCsv((p.raw && p.raw.DefaultContainers) ? p.raw.DefaultContainers.join(',') : '');
		setDialogContainersList((p.raw && p.raw.DefaultContainers) ? p.raw.DefaultContainers : []);
		setDialogBillOfLadingNumber('');
		setDialogNumberOfContainers('');
		setDialogContainerEntry('');			// initialize dialog rows based on default containers if present
			if(p.raw && p.raw.DefaultContainers && p.raw.DefaultContainers.length){
				setDialogContainerRows(p.raw.DefaultContainers.map(c => ({ container_number: c, container_type: '' }))); 
			}
		setOpenDialog(true);
	}

	async function handleCreate(){
		if(!selected) return;
		try{
// Build containers for dialog
					let conts = [];
					let dct = [];
					const dn = parseNumberOfContainers(dialogNumberOfContainers);
						if(dn > 0){
							if(dialogContainerRows.length !== dn || dialogContainerRows.some(r => !r.container_number || !String(r.container_number).trim())){alert('Please fill all container numbers for specified Number of Containers (dialog)'); return;}
						}
					if(dn > 0 && dialogContainerRows.length === dn){
						conts = dialogContainerRows.map(r => r.container_number || '').filter(Boolean);
						dct = dialogContainerRows.map(r => r.container_type || '').filter(Boolean);
					}else if(dialogContainersList.length){
						conts = dialogContainersList.map(c=>c);
					}else{
						conts = containersCsv.split(',').map(s=>s.trim()).filter(Boolean);
					}
			const payload = { verification_id: selected.id, document_type: 'STANDARD', containers: conts };					if(dct && dct.length) payload.ContainerTypes = dct;			if(dialogBillOfLadingNumber) payload.BillOfLadingNumber = dialogBillOfLadingNumber;
			if(dialogNumberOfContainers) payload.NumberOfContainers = dialogNumberOfContainers;
			await Api.createBooking(token, payload);
			// reset dialog fields
			setContainersCsv('');
			setDialogContainersList([]);
			setDialogContainerEntry('');
			setDialogBillOfLadingNumber('');
			setDialogNumberOfContainers('');
			setOpenDialog(false);
			setSelected(null);
			loadData();
			alert('Booking created');
		}catch(e){
			console.error(e);
			alert('Error creating booking: ' + (e.message || e));
		}
	}

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
											<Button size="small" disabled>Create Booking</Button>
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
											<TableCell>Action</TableCell>
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
										<span><Button size="small" disabled>Create</Button></span>
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

				{/* Booking form side panel */}
				<Grid item xs={12} md={4}>
					<Paper sx={{ p: 2 }}>
						<Typography variant="h6">Create Booking</Typography>
						<Typography variant="body2" color="text.secondary">Use a verified payment or verification to create a booking</Typography>
						<Box sx={{ mt: 2 }}>
							<FormControl fullWidth size="small" sx={{ mb: 2 }}>
								<InputLabel>Importer</InputLabel>
								<Select value={formImporterId} onChange={e=>setFormImporterId(e.target.value)} label="Importer">
									<MenuItem value="">(Select importer)</MenuItem>
									{importers.map(i => (
										<MenuItem key={i.ImporterID} value={i.ImporterID}>{i.ImporterName}</MenuItem>
									))}
								</Select>
							</FormControl>
							<FormControl fullWidth size="small" sx={{ mb: 2 }}>
								<InputLabel>Verification</InputLabel>
								<Select value={formVerificationId} onChange={e=>setFormVerificationId(e.target.value)} label="Verification" inputProps={{ 'data-testid': 'form-verification-select' }}>
									<MenuItem value="">(Select payment/verification)</MenuItem>
									{payments.map(p => (
										<MenuItem key={p.id} value={p.id}>{p.reference} • {p.importerName} • {p.amount} {p.currency}</MenuItem>
									))}
								</Select>
							</FormControl>
							<FormControl fullWidth size="small" sx={{ mb: 2 }}>
								<Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Information</Typography>
					<InputLabel>Document Type</InputLabel>
								<Select value={formDocumentType} onChange={e=>setFormDocumentType(e.target.value)} label="Document Type">
									<MenuItem value="STANDARD">STANDARD</MenuItem>
									<MenuItem value="MANUAL_RELEASE">MANUAL RELEASE</MenuItem>
									<MenuItem value="DUTY_FREE">DUTY FREE</MenuItem>
								</Select>
							</FormControl>
							<TextField fullWidth size="small" label="Bill of Lading Number (BL)" value={formBillOfLadingNumber} onChange={e=>setFormBillOfLadingNumber(e.target.value)} sx={{ mb: 2 }} />
				<TextField fullWidth size="small" label="Number of Containers (e.g., 3x20)" value={formNumberOfContainers} onChange={e=>setFormNumberOfContainers(e.target.value)} sx={{ mb: 2 }} inputProps={{ 'data-testid': 'form-number-of-containers' }} />

				{/* Containers Section */}
				<Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Containers</Typography>
				{parseNumberOfContainers(formNumberOfContainers) > 0 ? (
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
						{formContainerRows.map((r, idx) => (
							<Box key={idx} sx={{ display: 'flex', gap: 1 }}>
							<TextField fullWidth size="small" label={`Container #${idx+1}`} value={r.container_number} onChange={e=>setFormContainerRows(prev=>prev.map((p,i)=>i===idx?{...p,container_number:e.target.value}:p))} inputProps={{ 'data-testid': `form-container-number-${idx}` }} />
							<FormControl size="small" sx={{ minWidth: 160 }}>
								<InputLabel>Type</InputLabel>
								<Select value={r.container_type} label="Type" onChange={e=>setFormContainerRows(prev=>prev.map((p,i)=>i===idx?{...p,container_type:e.target.value}:p))} inputProps={{ 'data-testid': `form-container-type-${idx}` }}>
										<MenuItem value="">(Select)</MenuItem>
										{containerTypes.map((ct)=> <MenuItem key={ct} value={ct}>{ct}</MenuItem>)}
									</Select>
								</FormControl>
							</Box>
						))}
					</Box>
) : (
                    <>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                            <TextField fullWidth size="small" placeholder="Enter container number" value={formContainerEntry} onChange={e=>setFormContainerEntry(e.target.value)} />
                            <Button size="small" variant="outlined" onClick={()=>{
                                if(!formContainerEntry.trim()) return;
                                setFormContainersList(prev=>[...prev, formContainerEntry.trim()]);
                                setFormContainerEntry('');
                            }}>Add</Button>
                        </Box>

                        {formContainersList.length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                {formContainersList.map((c, i) => (
                                    <Chip key={i} label={c} onDelete={() => setFormContainersList(prev => prev.filter((_, idx) => idx !== i))} deleteIcon={<DeleteIcon/>} />
                                ))}
                            </Box>
                        )}

                        {/* CSV fallback (used only when no individual containers were added) */}
                        <TextField fullWidth size="small" label="Containers (CSV) - used if no individual containers added" value={formContainers} onChange={e=>setFormContainers(e.target.value)} sx={{ mb: 2 }} />
					</>
				)}

				{/* Extra bookings section for MANUAL_RELEASE */}
						{formDocumentType === 'MANUAL_RELEASE' && (
							<Box sx={{ mt: 2, p: 1, border: '1px dashed', borderColor: 'divider', mb: 2 }}>
								<Typography variant="subtitle2">Manual Release - Extra Bookings</Typography>
								<Button size="small" startIcon={<AddIcon/>} onClick={()=>setExtraManualBookings(prev=>[...prev, { BillOfLadingNumber: '', NumberOfContainers: '' } ])}>Add extra booking</Button>
								{extraManualBookings.map((eb, idx) => (
									<Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
										<TextField size="small" label="BL Number" value={eb.BillOfLadingNumber} onChange={e => setExtraManualBookings(prev => prev.map((p, i) => i === idx ? { ...p, BillOfLadingNumber: e.target.value } : p ))} />
										<TextField size="small" label="Number of Containers" value={eb.NumberOfContainers} onChange={e => setExtraManualBookings(prev => prev.map((p, i) => i === idx ? { ...p, NumberOfContainers: e.target.value } : p ))} />
										<IconButton size="small" onClick={() => setExtraManualBookings(prev => prev.filter((_, i) => i !== idx))}><DeleteIcon/></IconButton>
									</Box>
								))}
							</Box>
						)}

						{/* Extra bookings section for DUTY_FREE */}
						{formDocumentType === 'DUTY_FREE' && (
							<Box sx={{ mt: 2, p: 1, border: '1px dashed', borderColor: 'divider', mb: 2 }}>
								<Typography variant="subtitle2">Duty Free - Extra Bookings</Typography>
								<Button size="small" startIcon={<AddIcon/>} onClick={()=>setExtraDutyBookings(prev=>[...prev, { BillOfLadingNumber: '', NumberOfContainers: '' } ])}>Add extra booking</Button>
								{extraDutyBookings.map((eb, idx) => (
									<Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
										<TextField size="small" label="BL Number" value={eb.BillOfLadingNumber} onChange={e => setExtraDutyBookings(prev => prev.map((p, i) => i === idx ? { ...p, BillOfLadingNumber: e.target.value } : p ))} />
										<TextField size="small" label="Number of Containers" value={eb.NumberOfContainers} onChange={e => setExtraDutyBookings(prev => prev.map((p, i) => i === idx ? { ...p, NumberOfContainers: e.target.value } : p ))} />
										<IconButton size="small" onClick={() => setExtraDutyBookings(prev => prev.filter((_, i) => i !== idx))}><DeleteIcon/></IconButton>
									</Box>
								))}
							</Box>
						)}							<Button variant="contained" fullWidth onClick={async ()=>{
								try{
						const n = parseNumberOfContainers(formNumberOfContainers);
						if(n > 0){
							if(formContainerRows.length !== n || formContainerRows.some(r => !r.container_number || !String(r.container_number).trim())){alert('Please fill all container numbers for specified Number of Containers'); return;}
						}
// Build containers from rows if rows defined otherwise use list or CSV fallback
						let conts = [];
						let ct = [];
					const n2 = parseNumberOfContainers(formNumberOfContainers);
					if(n2 > 0 && formContainerRows.length === n2){
							conts = formContainerRows.map(r => r.container_number || '').filter(Boolean);
							// include container types if provided
							ct = formContainerRows.map(r => r.container_type || '').filter(Boolean);
						}else if(formContainersList.length){
							conts = formContainersList.map(c=>c);
						}else{
							conts = formContainers.split(',').map(s=>s.trim()).filter(Boolean);
						}
									const payload = { ImporterID: formImporterId, document_type: formDocumentType, verification_id: formVerificationId, containers: conts }
						if(ct && ct.length) payload.ContainerTypes = ct
						if(formBillOfLadingNumber) payload.BillOfLadingNumber = formBillOfLadingNumber
						if(formNumberOfContainers) payload.NumberOfContainers = formNumberOfContainers
						if(extraManualBookings.length) payload.extra_manual_bookings = extraManualBookings
						if(extraDutyBookings.length) payload.extra_duty_bookings = extraDutyBookings
						await Api.createBooking(token, payload)
									alert('Booking created')
									setFormContainers('')
									setFormImporterId('')
									setFormVerificationId('')
						setFormContainersList([])
					setFormContainerEntry('')
					setFormContainerRows([])
					setFormBillOfLadingNumber('')
						setFormNumberOfContainers('')
						setExtraManualBookings([])
						setExtraDutyBookings([])
									loadData()
								} catch(e){ console.error(e); alert('Error creating booking: ' + e.message) }
							}} data-testid="form-create-booking" disabled>Create Booking</Button>
						</Box>
					</Paper>
				</Grid>
			</Grid>

			{/* Dialog reuse for older flow */}
			<Dialog open={openDialog} onClose={()=>setOpenDialog(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Create Booking</DialogTitle>
				<DialogContent>
					{selected && (
						<Box sx={{ mt: 1 }}>
							<Typography variant="subtitle2">Payment: {selected.reference}</Typography>
							<Typography variant="body2" sx={{ color: 'text.secondary' }}>{selected.bank} • {selected.importerName}</Typography>
							<Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Information</Typography>
						<TextField fullWidth label="Bill of Lading Number (BL)" value={dialogBillOfLadingNumber} onChange={e=>setDialogBillOfLadingNumber(e.target.value)} sx={{ mt: 2 }} />
						<TextField fullWidth label="Number of Containers (e.g., 3x20)" value={dialogNumberOfContainers} onChange={e=>setDialogNumberOfContainers(e.target.value)} sx={{ mt: 1 }} />
						<Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Containers</Typography>

						{/* Containers area (dialog) */}
						{parseNumberOfContainers(dialogNumberOfContainers) > 0 ? (
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
								{dialogContainerRows.map((r, idx) => (
									<Box key={idx} sx={{ display: 'flex', gap: 1 }}>
										<TextField fullWidth size="small" label={`Container #${idx+1}`} value={r.container_number} onChange={e=>setDialogContainerRows(prev=>prev.map((p,i)=>i===idx?{...p,container_number:e.target.value}:p))} />
										<FormControl size="small" sx={{ minWidth: 160 }}>
											<InputLabel>Type</InputLabel>
											<Select value={r.container_type} label="Type" onChange={e=>setDialogContainerRows(prev=>prev.map((p,i)=>i===idx?{...p,container_type:e.target.value}:p))}>
												<MenuItem value="">(Select)</MenuItem>
												{containerTypes.map((ct)=> <MenuItem key={ct} value={ct}>{ct}</MenuItem>)}
											</Select>
										</FormControl>
									</Box>
								))}
							</Box>
						) : (
							<Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
								<TextField fullWidth size="small" placeholder="Enter container number" value={dialogContainerEntry} onChange={e=>setDialogContainerEntry(e.target.value)} />
								<Button size="small" variant="outlined" onClick={()=>{
									if(!dialogContainerEntry.trim()) return;
									setDialogContainersList(prev=>[...prev, dialogContainerEntry.trim()]);
									setDialogContainerEntry('');
								}}>Add</Button>
							</Box>
						)}
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={()=>setOpenDialog(false)}>Cancel</Button>
					<Button variant="contained" onClick={handleCreate}>Create</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}




