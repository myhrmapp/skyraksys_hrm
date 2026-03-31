import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Container, Paper, Grid, Chip, Avatar, Card, CardContent,
  IconButton, Fade, Divider, LinearProgress, Stack,
  useTheme, alpha
} from '@mui/material';
import {
  People, EventNote, Schedule, AccountBalance, Assignment, Assessment,
  Storage, Security, Cloud, Speed, Code, Dashboard,
  NavigateNext, NavigateBefore, PlayArrow, Pause, VolumeUp,
  CheckCircle, Business,
  Layers, Api, DataObject, Lock, Shield, Dns, Terminal,
  AccountTree, Hub, FolderOpen, TableChart, Build, Verified
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// ── Gradient text ──
const GradientText = ({ children, sx = {} }) => (
  <Typography component="span" sx={{
    background: 'linear-gradient(135deg, #2196F3 0%, #9C27B0 50%, #F44336 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    ...sx,
  }}>
    {children}
  </Typography>
);

// ── Section title ──
const SectionTitle = ({ icon, title, subtitle, theme }) => (
  <Box sx={{ mb: 5, textAlign: 'center' }}>
    <Avatar sx={{
      width: 56, height: 56, mx: 'auto', mb: 2,
      bgcolor: alpha(theme.palette.primary.main, 0.1),
      color: 'primary.main',
    }}>
      {icon}
    </Avatar>
    <Typography variant="h4" fontWeight={700} gutterBottom>
      {title}
    </Typography>
    {subtitle && (
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
        {subtitle}
      </Typography>
    )}
  </Box>
);

// ── Animated Counter ──
const AnimatedCounter = ({ end, duration = 2000, prefix = '', suffix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const startTime = Date.now();
        const tick = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * end));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
};

// ── Section with scroll-reveal ──
const RevealSection = ({ children, delay = 0 }) => {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setTimeout(() => setVisible(true), delay);
        observer.disconnect();
      }
    }, { threshold: 0.15 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <Box ref={ref} sx={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(40px)',
      transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      {children}
    </Box>
  );
};

// ── Narration data ──
const NARRATION_STEPS = [
  { section: 0, text: "Welcome to SkyrakSys HRM — a cloud-ready, full-stack Human Resource Management System designed for small-to-mid enterprises." },
  { section: 1, text: "The platform manages 7 core HR modules — from employee lifecycle and leave management to payroll processing and performance reviews." },
  { section: 2, text: "Built on a layered monolithic architecture with 4 clean tiers — Presentation, API, Service, and Data — ensuring maintainability and clear separation of concerns." },
  { section: 3, text: "Powered by a modern tech stack: React 18 with Material-UI on the frontend, Node.js with Express on the backend, and PostgreSQL for reliable data storage." },
  { section: 4, text: "The data model spans 22 tables with UUID primary keys, soft deletes for compliance, and 238 REST endpoints across 27 route files." },
  { section: 5, text: "Security is built into every layer — JWT authentication with httpOnly cookies, 4-level role-based access control, field-level permissions, and account lockout protection." },
  { section: 6, text: "Deployment is fully containerized with Docker Compose — 6 services including Nginx reverse proxy with TLS, automated health checks, and zero-downtime redeploy." },
  { section: 7, text: "Thank you for exploring SkyrakSys HRM. This system is production-ready, tested with 79 Playwright E2E scenarios, and designed to scale with your organization." },
];

// ── Module data ──
const MODULES = [
  { icon: <People />, name: 'Employee Management', color: '#2196F3',
    desc: 'Full lifecycle management from hire to exit. 4-tab wizard, bulk import, photo upload, auto-generated employee IDs.',
    stats: '22 fields · CSV/Excel import · SKYT prefix IDs' },
  { icon: <EventNote />, name: 'Leave Management', color: '#4CAF50',
    desc: '12 leave types with multi-level approval chains. Balance tracking, overlap detection, and annual accrual engine.',
    stats: '12 types · 3-level approval · Accrual engine' },
  { icon: <Schedule />, name: 'Time & Attendance', color: '#FF9800',
    desc: 'Weekly timesheet entry with project linkage. Daily check-in/out with GPS-ready fields. Overtime calculation.',
    stats: 'Weekly grid · OT calc · GPS-ready' },
  { icon: <AccountBalance />, name: 'Payroll & Payslips', color: '#9C27B0',
    desc: 'Monthly payroll with Indian compliance (PF, ESI, TDS, PT). PDF payslips with customizable templates.',
    stats: 'PF/ESI/TDS · PDF generation · Templates' },
  { icon: <Assignment />, name: 'Projects & Tasks', color: '#F44336',
    desc: 'Project lifecycle management with task assignment. Status tracking and timesheet linkage for effort tracking.',
    stats: 'Kanban flow · Effort tracking · Linkage' },
  { icon: <Assessment />, name: 'Performance Reviews', color: '#00BCD4',
    desc: 'Structured employee reviews with rating scales and written feedback. Manager-initiated review cycles.',
    stats: 'Rating scales · Feedback · Cycles' },
  { icon: <Business />, name: 'Organization Setup', color: '#607D8B',
    desc: 'Department hierarchy, position catalog with salary bands, holiday calendar, and system configuration.',
    stats: 'Dept tree · Salary bands · Holidays' },
];

// ── Architecture layers ──
const ARCH_LAYERS = [
  { name: 'Presentation Layer', sub: 'React 18 · MUI 5 · TanStack Query · Axios', color: '#2196F3', icon: <Dashboard /> },
  { name: 'API Layer', sub: 'Express 4.18 · 27 Route Files · Joi Validation · JWT Auth', color: '#4CAF50', icon: <Api /> },
  { name: 'Service Layer', sub: 'Business + Data + Root Services · Workflow Engines', color: '#FF9800', icon: <AccountTree /> },
  { name: 'Data Layer', sub: 'PostgreSQL 15+ · Sequelize ORM · 22 Tables · UUID PKs', color: '#9C27B0', icon: <Storage /> },
];

// ── Tech stack ──
const TECH_STACK = {
  Backend: [
    { name: 'Node.js', version: '22.x LTS', color: '#68A063' },
    { name: 'Express', version: '4.18', color: '#333' },
    { name: 'Sequelize', version: '6.37', color: '#3B76C3' },
    { name: 'PostgreSQL', version: '15+', color: '#336791' },
    { name: 'JWT', version: '9.x', color: '#D63AFF' },
    { name: 'Joi', version: '17.x', color: '#0080FF' },
    { name: 'Nodemailer', version: '6.x', color: '#22B573' },
    { name: 'Winston', version: 'Latest', color: '#FF6B00' },
  ],
  Frontend: [
    { name: 'React', version: '18.3', color: '#61DAFB' },
    { name: 'Material-UI', version: '5.15', color: '#007FFF' },
    { name: 'TanStack Query', version: '5.90', color: '#FF4154' },
    { name: 'React Router', version: '6.25', color: '#CA4245' },
    { name: 'React Hook Form', version: '7.48', color: '#EC5990' },
    { name: 'Recharts', version: '2.8', color: '#8884D8' },
    { name: 'Axios', version: '1.11', color: '#5A29E4' },
    { name: 'Notistack', version: '3.0', color: '#4DB6AC' },
  ],
  Infrastructure: [
    { name: 'Docker', version: 'Compose', color: '#2496ED' },
    { name: 'Nginx', version: 'Latest', color: '#009639' },
    { name: 'GitHub Actions', version: 'CI/CD', color: '#2088FF' },
    { name: 'Playwright', version: '1.58', color: '#45BA4B' },
    { name: 'Jest', version: 'Latest', color: '#C21325' },
    { name: 'Ubuntu', version: '24.04', color: '#E95420' },
  ],
};

// ── Roles ──
const ROLES = [
  { name: 'Admin', color: '#F44336', access: 'Full system access',
    caps: ['All CRUD operations', 'System configuration', 'Payroll approval', 'User management', 'Data restore'] },
  { name: 'HR', color: '#9C27B0', access: 'HR operations scope',
    caps: ['Employee management', 'Leave/timesheet review', 'Payroll generation', 'Reports', 'Onboarding'] },
  { name: 'Manager', color: '#2196F3', access: 'Team scope',
    caps: ['Approve team leave', 'Approve timesheets', 'View team data', 'Performance reviews', 'Project oversight'] },
  { name: 'Employee', color: '#4CAF50', access: 'Self-service',
    caps: ['View own profile', 'Submit leave/timesheets', 'Check-in/out', 'View payslips', 'My tasks'] },
];

// ── Chart data ──
const ENDPOINT_DATA = [
  { name: 'Auth', endpoints: 8, color: '#F44336' },
  { name: 'Employees', endpoints: 32, color: '#2196F3' },
  { name: 'Leave', endpoints: 28, color: '#4CAF50' },
  { name: 'Timesheets', endpoints: 24, color: '#FF9800' },
  { name: 'Payroll', endpoints: 36, color: '#9C27B0' },
  { name: 'Projects', endpoints: 18, color: '#00BCD4' },
  { name: 'Attendance', endpoints: 16, color: '#607D8B' },
  { name: 'Admin', endpoints: 42, color: '#795548' },
  { name: 'Dashboard', endpoints: 12, color: '#E91E63' },
  { name: 'Other', endpoints: 22, color: '#9E9E9E' },
];

const TABLE_DATA = [
  { name: 'Core', value: 6, color: '#2196F3' },
  { name: 'Leave', value: 3, color: '#4CAF50' },
  { name: 'Payroll', value: 5, color: '#9C27B0' },
  { name: 'Time', value: 3, color: '#FF9800' },
  { name: 'Projects', value: 2, color: '#00BCD4' },
  { name: 'System', value: 3, color: '#607D8B' },
];

const DOCKER_SERVICES = [
  { name: 'nginx', port: '80/443', desc: 'Reverse proxy, TLS, rate limiting', color: '#009639', icon: <Dns /> },
  { name: 'frontend', port: '3000', desc: 'React SPA (Nginx serving)', color: '#61DAFB', icon: <Dashboard /> },
  { name: 'mobile', port: '3001', desc: 'Expo Web (Nginx serving)', color: '#4630EB', icon: <Speed /> },
  { name: 'backend', port: '5000', desc: 'Express API server', color: '#68A063', icon: <Api /> },
  { name: 'postgres', port: '5432', desc: 'PostgreSQL 17 database', color: '#336791', icon: <Storage /> },
  { name: 'pgadmin', port: '5050', desc: 'Database admin (tools profile)', color: '#336791', icon: <TableChart /> },
];

// ── Security features ──
const SECURITY_FEATURES = [
  { icon: <Lock />, title: 'JWT httpOnly Cookies', desc: 'Tokens stored in httpOnly cookies, immune to XSS attacks. Short-lived access + long-lived refresh tokens.' },
  { icon: <Shield />, title: '4-Level RBAC', desc: 'Admin → HR → Manager → Employee. Field-level access control restricts salary/bank visibility.' },
  { icon: <Verified />, title: 'Account Protection', desc: 'Failed login lockout, password change tracking, token blacklisting on logout.' },
  { icon: <Security />, title: 'Security Middleware', desc: 'Helmet, HPP, XSS-clean, rate limiting per route, CORS with strict origin policy.' },
];

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
export default function SystemShowcase() {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const sectionRefs = useRef([]);
  const timerRef = useRef(null);

  const totalSteps = NARRATION_STEPS.length;

  const scrollToSection = useCallback((index) => {
    sectionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleNext = useCallback(() => {
    setActiveStep(prev => {
      const next = Math.min(prev + 1, totalSteps - 1);
      scrollToSection(next);
      return next;
    });
  }, [totalSteps, scrollToSection]);

  const handlePrev = useCallback(() => {
    setActiveStep(prev => {
      const next = Math.max(prev - 1, 0);
      scrollToSection(next);
      return next;
    });
  }, [scrollToSection]);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // Auto-advance when playing
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setActiveStep(prev => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          const next = prev + 1;
          scrollToSection(next);
          return next;
        });
      }, 8000);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, totalSteps, scrollToSection]);

  const progress = ((activeStep + 1) / totalSteps) * 100;

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pb: 8 }}>

      {/* ── Sticky Narration Bar ── */}
      <Paper elevation={3} sx={{
        position: 'sticky', top: 0, zIndex: 1100,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.95)} 0%, ${alpha('#1a1a2e', 0.97)} 100%)`,
        color: '#fff', borderRadius: 0,
      }}>
        <Container maxWidth="lg">
          <Box sx={{ py: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={togglePlay} size="small" sx={{ color: '#fff' }}>
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
            <IconButton onClick={handlePrev} size="small" sx={{ color: '#fff' }} disabled={activeStep === 0}>
              <NavigateBefore />
            </IconButton>
            <IconButton onClick={handleNext} size="small" sx={{ color: '#fff' }} disabled={activeStep === totalSteps - 1}>
              <NavigateNext />
            </IconButton>

            <Box sx={{ flex: 1, mx: 2 }}>
              <Fade in key={activeStep}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <VolumeUp sx={{ fontSize: 18, opacity: 0.7, flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.95, lineHeight: 1.4 }}>
                    "{NARRATION_STEPS[activeStep].text}"
                  </Typography>
                </Box>
              </Fade>
            </Box>

            <Chip
              label={`${activeStep + 1} / ${totalSteps}`}
              size="small"
              sx={{ bgcolor: alpha('#fff', 0.15), color: '#fff', fontWeight: 600, minWidth: 56 }}
            />
          </Box>
          <LinearProgress variant="determinate" value={progress} sx={{
            height: 3, bgcolor: alpha('#fff', 0.1),
            '& .MuiLinearProgress-bar': {
              background: 'linear-gradient(90deg, #4CAF50, #2196F3, #9C27B0)',
            }
          }} />
        </Container>
      </Paper>

      <Container maxWidth="lg" sx={{ pt: 4 }}>

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  SECTION 0 — HERO                                          */}
        {/* ════════════════════════════════════════════════════════════ */}
        <Box ref={el => sectionRefs.current[0] = el} sx={{ pt: 2, pb: 8, scrollMarginTop: '80px' }}>
          <RevealSection>
            <Box sx={{
              textAlign: 'center', py: 8,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha('#9C27B0', 0.05)} 100%)`,
              borderRadius: 4, mb: 5,
            }}>
              <Typography variant="overline" sx={{ letterSpacing: 4, color: 'primary.main', fontWeight: 600 }}>
                CLOUD-READY FULL-STACK PLATFORM
              </Typography>
              <Typography variant="h2" fontWeight={800} sx={{ mt: 1, mb: 2 }}>
                <GradientText sx={{ fontSize: 'inherit', fontWeight: 'inherit' }}>SkyrakSys HRM</GradientText>
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto', mb: 4, fontWeight: 400 }}>
                Human Resource Management System designed for small-to-mid enterprises (50–500 employees).
                Automates core HR workflows with a secure RESTful API.
              </Typography>

              <Grid container spacing={3} sx={{ maxWidth: 900, mx: 'auto', mt: 2 }}>
                {[
                  { label: 'REST Endpoints', value: 238, suffix: '+', icon: <Api /> },
                  { label: 'Database Tables', value: 22, icon: <TableChart /> },
                  { label: 'Route Files', value: 27, icon: <FolderOpen /> },
                  { label: 'E2E Test Cases', value: 79, icon: <Verified /> },
                ].map((stat, i) => (
                  <Grid item xs={6} sm={3} key={stat.label}>
                    <RevealSection delay={i * 150}>
                      <Paper elevation={0} sx={{
                        p: 2.5, textAlign: 'center', borderRadius: 3,
                        border: '1px solid', borderColor: 'divider',
                        transition: 'all 0.3s',
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
                      }}>
                        <Avatar sx={{
                          width: 40, height: 40, mx: 'auto', mb: 1,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                        }}>
                          {stat.icon}
                        </Avatar>
                        <Typography variant="h4" fontWeight={700} color="primary">
                          <AnimatedCounter end={stat.value} suffix={stat.suffix || ''} />
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          {stat.label}
                        </Typography>
                      </Paper>
                    </RevealSection>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </RevealSection>
        </Box>

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  SECTION 1 — BUSINESS MODULES                              */}
        {/* ════════════════════════════════════════════════════════════ */}
        <Box ref={el => sectionRefs.current[1] = el} sx={{ pb: 8, scrollMarginTop: '80px' }}>
          <RevealSection>
            <SectionTitle
              theme={theme}
              icon={<Hub />}
              title="Business Modules"
              subtitle="7 integrated modules covering the complete HR lifecycle — every module talks to each other"
            />
          </RevealSection>

          <Grid container spacing={3}>
            {MODULES.map((mod, i) => (
              <Grid item xs={12} sm={6} md={4} key={mod.name}>
                <RevealSection delay={i * 100}>
                  <Card elevation={0} sx={{
                    height: '100%', borderRadius: 3,
                    border: '1px solid', borderColor: 'divider',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: `0 12px 24px ${alpha(mod.color, 0.15)}`,
                      borderColor: mod.color,
                    },
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Avatar sx={{ bgcolor: alpha(mod.color, 0.1), color: mod.color }}>
                          {mod.icon}
                        </Avatar>
                        <Typography variant="h6" fontWeight={600}>{mod.name}</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 60 }}>
                        {mod.desc}
                      </Typography>
                      <Chip
                        label={mod.stats}
                        size="small"
                        sx={{
                          bgcolor: alpha(mod.color, 0.08),
                          color: mod.color,
                          fontWeight: 500,
                          fontSize: '0.7rem',
                        }}
                      />
                    </CardContent>
                  </Card>
                </RevealSection>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  SECTION 2 — ARCHITECTURE                                  */}
        {/* ════════════════════════════════════════════════════════════ */}
        <Box ref={el => sectionRefs.current[2] = el} sx={{ pb: 8, scrollMarginTop: '80px' }}>
          <RevealSection>
            <SectionTitle
              theme={theme}
              icon={<Layers />}
              title="Layered Architecture"
              subtitle="Clean separation of concerns with a clear path from HTTP request to database and back"
            />
          </RevealSection>

          <Box sx={{ maxWidth: 700, mx: 'auto' }}>
            {ARCH_LAYERS.map((layer, i) => (
              <RevealSection key={layer.name} delay={i * 200}>
                <Paper elevation={0} sx={{
                  p: 3,
                  borderRadius: i === 0 ? '16px 16px 0 0' : (i === ARCH_LAYERS.length - 1 ? '0 0 16px 16px' : 0),
                  borderLeft: `4px solid ${layer.color}`,
                  borderRight: '1px solid', borderTop: '1px solid',
                  borderBottom: i === ARCH_LAYERS.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  borderLeftColor: layer.color,
                  background: alpha(layer.color, 0.03),
                  transition: 'all 0.3s',
                  '&:hover': { background: alpha(layer.color, 0.08), transform: 'scale(1.01)' },
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha(layer.color, 0.15), color: layer.color, width: 48, height: 48 }}>
                      {layer.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>{layer.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{layer.sub}</Typography>
                    </Box>
                  </Box>
                </Paper>
                {i < ARCH_LAYERS.length - 1 && (
                  <Box sx={{ textAlign: 'center', my: 0.5 }}>
                    <Typography sx={{ color: 'text.disabled', fontSize: 20 }}>▼</Typography>
                  </Box>
                )}
              </RevealSection>
            ))}
          </Box>

          {/* Architecture flow */}
          <RevealSection delay={900}>
            <Paper elevation={0} sx={{
              mt: 4, p: 3, borderRadius: 3,
              border: '1px solid', borderColor: 'divider',
              bgcolor: alpha(theme.palette.info.main, 0.03),
            }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                Request Flow Example: "Employee submits leave request"
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" useFlexGap>
                {[
                  'React Form (validation)',
                  'Axios POST /api/leaves',
                  'Auth Middleware (JWT)',
                  'Joi Schema Validation',
                  'LeaveService.create()',
                  'Overlap Detection',
                  'Balance Check',
                  'Sequelize INSERT',
                  'PostgreSQL',
                  '201 Response',
                  'React Query Cache Update',
                  'Success Snackbar',
                ].map((step, i, arr) => (
                  <React.Fragment key={step}>
                    <Chip
                      label={step}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', fontWeight: 500 }}
                    />
                    {i < arr.length - 1 && (
                      <Typography color="text.disabled" sx={{ fontSize: 14 }}>→</Typography>
                    )}
                  </React.Fragment>
                ))}
              </Stack>
            </Paper>
          </RevealSection>
        </Box>

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  SECTION 3 — TECH STACK                                    */}
        {/* ════════════════════════════════════════════════════════════ */}
        <Box ref={el => sectionRefs.current[3] = el} sx={{ pb: 8, scrollMarginTop: '80px' }}>
          <RevealSection>
            <SectionTitle
              theme={theme}
              icon={<Code />}
              title="Technology Stack"
              subtitle="Modern, battle-tested technologies chosen for reliability, developer productivity, and ecosystem support"
            />
          </RevealSection>

          <Grid container spacing={4}>
            {Object.entries(TECH_STACK).map(([category, techs], ci) => (
              <Grid item xs={12} md={4} key={category}>
                <RevealSection delay={ci * 200}>
                  <Paper elevation={0} sx={{
                    p: 3, borderRadius: 3, height: '100%',
                    border: '1px solid', borderColor: 'divider',
                  }}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                      {category === 'Backend' && <Terminal sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />}
                      {category === 'Frontend' && <Dashboard sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />}
                      {category === 'Infrastructure' && <Cloud sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />}
                      {category}
                    </Typography>
                    <Stack spacing={1.5}>
                      {techs.map(tech => (
                        <Box key={tech.name} sx={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          py: 0.5,
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                              width: 8, height: 8, borderRadius: '50%',
                              bgcolor: tech.color, flexShrink: 0,
                            }} />
                            <Typography variant="body2" fontWeight={500}>{tech.name}</Typography>
                          </Box>
                          <Chip
                            label={tech.version}
                            size="small"
                            sx={{
                              height: 22, fontSize: '0.65rem', fontWeight: 600,
                              bgcolor: alpha(tech.color, 0.1),
                              color: tech.color,
                            }}
                          />
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                </RevealSection>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  SECTION 4 — DATA MODEL & API                              */}
        {/* ════════════════════════════════════════════════════════════ */}
        <Box ref={el => sectionRefs.current[4] = el} sx={{ pb: 8, scrollMarginTop: '80px' }}>
          <RevealSection>
            <SectionTitle
              theme={theme}
              icon={<DataObject />}
              title="Data Model & API Surface"
              subtitle="22 tables with UUID primary keys, soft deletes, and 238 REST endpoints across 27 route files"
            />
          </RevealSection>

          <Grid container spacing={4}>
            {/* Endpoints chart */}
            <Grid item xs={12} md={7}>
              <RevealSection>
                <Paper elevation={0} sx={{
                  p: 3, borderRadius: 3, height: '100%',
                  border: '1px solid', borderColor: 'divider',
                }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    API Endpoints by Module
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ENDPOINT_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RTooltip />
                      <Bar dataKey="endpoints" radius={[4, 4, 0, 0]}>
                        {ENDPOINT_DATA.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </RevealSection>
            </Grid>

            {/* Tables pie chart */}
            <Grid item xs={12} md={5}>
              <RevealSection delay={200}>
                <Paper elevation={0} sx={{
                  p: 3, borderRadius: 3, height: '100%',
                  border: '1px solid', borderColor: 'divider',
                }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Database Tables by Domain
                  </Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={TABLE_DATA}
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name} (${value})`}
                      >
                        {TABLE_DATA.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <RTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </RevealSection>
            </Grid>
          </Grid>

          {/* Key design decisions */}
          <RevealSection delay={400}>
            <Grid container spacing={2} sx={{ mt: 2 }}>
              {[
                { icon: <DataObject />, label: 'UUID Primary Keys', desc: 'Globally unique, merge-safe, no sequential leaks' },
                { icon: <Build />, label: 'Soft Deletes', desc: 'Data recovery + audit compliance on all tables' },
                { icon: <AccountTree />, label: 'Service Layer', desc: 'Business ↔ Data separation for testability' },
                { icon: <Speed />, label: 'TanStack Query', desc: 'Auto caching, dedup, background refresh' },
              ].map((item, i) => (
                <Grid item xs={12} sm={6} md={3} key={item.label}>
                  <Paper elevation={0} sx={{
                    p: 2, borderRadius: 2, textAlign: 'center',
                    border: '1px solid', borderColor: 'divider',
                    transition: 'all 0.3s',
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: 2 },
                  }}>
                    <Box sx={{ color: 'primary.main', mb: 1 }}>{item.icon}</Box>
                    <Typography variant="subtitle2" fontWeight={600}>{item.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </RevealSection>
        </Box>

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  SECTION 5 — SECURITY                                      */}
        {/* ════════════════════════════════════════════════════════════ */}
        <Box ref={el => sectionRefs.current[5] = el} sx={{ pb: 8, scrollMarginTop: '80px' }}>
          <RevealSection>
            <SectionTitle
              theme={theme}
              icon={<Security />}
              title="Security & Access Control"
              subtitle="Defense-in-depth with JWT auth, 4-level RBAC, field-level permissions, and hardened middleware"
            />
          </RevealSection>

          {/* Security features */}
          <Grid container spacing={3} sx={{ mb: 5 }}>
            {SECURITY_FEATURES.map((feat, i) => (
              <Grid item xs={12} sm={6} key={feat.title}>
                <RevealSection delay={i * 150}>
                  <Paper elevation={0} sx={{
                    p: 3, borderRadius: 3, height: '100%',
                    border: '1px solid', borderColor: 'divider',
                    display: 'flex', gap: 2,
                  }}>
                    <Avatar sx={{ bgcolor: alpha('#F44336', 0.1), color: '#F44336' }}>
                      {feat.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>{feat.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{feat.desc}</Typography>
                    </Box>
                  </Paper>
                </RevealSection>
              </Grid>
            ))}
          </Grid>

          {/* Role cards */}
          <RevealSection delay={600}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3, textAlign: 'center' }}>
              Role-Based Access Matrix
            </Typography>
          </RevealSection>
          <Grid container spacing={3}>
            {ROLES.map((role, i) => (
              <Grid item xs={12} sm={6} md={3} key={role.name}>
                <RevealSection delay={700 + i * 100}>
                  <Card elevation={0} sx={{
                    borderRadius: 3, overflow: 'hidden', height: '100%',
                    border: '1px solid', borderColor: 'divider',
                    transition: 'all 0.3s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                  }}>
                    <Box sx={{ bgcolor: role.color, py: 2, textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
                        {role.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: alpha('#fff', 0.8) }}>
                        {role.access}
                      </Typography>
                    </Box>
                    <CardContent sx={{ pt: 2 }}>
                      <Stack spacing={1}>
                        {role.caps.map(cap => (
                          <Box key={cap} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckCircle sx={{ fontSize: 16, color: role.color }} />
                            <Typography variant="body2">{cap}</Typography>
                          </Box>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </RevealSection>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  SECTION 6 — INFRASTRUCTURE                                */}
        {/* ════════════════════════════════════════════════════════════ */}
        <Box ref={el => sectionRefs.current[6] = el} sx={{ pb: 8, scrollMarginTop: '80px' }}>
          <RevealSection>
            <SectionTitle
              theme={theme}
              icon={<Cloud />}
              title="Infrastructure & Deployment"
              subtitle="Fully containerized with Docker Compose — 6 services, health checks, TLS, and zero-downtime redeploy"
            />
          </RevealSection>

          {/* Docker services */}
          <RevealSection>
            <Paper elevation={0} sx={{
              p: 4, borderRadius: 3,
              border: '1px solid', borderColor: 'divider',
              background: `linear-gradient(135deg, ${alpha('#1a1a2e', 0.03)} 0%, ${alpha('#2196F3', 0.03)} 100%)`,
            }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Dns sx={{ color: 'primary.main' }} /> Docker Compose Services
              </Typography>

              <Grid container spacing={2}>
                {DOCKER_SERVICES.map((svc, i) => (
                  <Grid item xs={12} sm={6} md={4} key={svc.name}>
                    <RevealSection delay={i * 100}>
                      <Paper elevation={0} sx={{
                        p: 2.5, borderRadius: 2,
                        border: '1px solid', borderColor: 'divider',
                        borderLeft: `4px solid ${svc.color}`,
                        transition: 'all 0.3s',
                        '&:hover': { bgcolor: alpha(svc.color, 0.04) },
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                          <Avatar sx={{
                            width: 36, height: 36,
                            bgcolor: alpha(svc.color, 0.1), color: svc.color,
                          }}>
                            {svc.icon}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>{svc.name}</Typography>
                            <Chip label={`:${svc.port}`} size="small" sx={{
                              height: 18, fontSize: '0.6rem', fontWeight: 600,
                              bgcolor: alpha(svc.color, 0.1), color: svc.color,
                            }} />
                          </Box>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {svc.desc}
                        </Typography>
                      </Paper>
                    </RevealSection>
                  </Grid>
                ))}
              </Grid>

              {/* Service dependency flow */}
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Service Dependency Chain (health-check gated)
                </Typography>
                <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
                  {['postgres', '→', 'backend', '→', 'frontend + mobile', '→', 'nginx'].map((item, idx) => (
                    item === '→' ? (
                      <Typography key={`arrow-${idx}`} sx={{ color: 'text.disabled', lineHeight: '32px' }}>→</Typography>
                    ) : (
                      <Chip key={item} label={item} variant="outlined" size="small"
                        sx={{ fontWeight: 600, fontSize: '0.75rem' }} />
                    )
                  ))}
                </Stack>
              </Box>
            </Paper>
          </RevealSection>

          {/* Deployment features */}
          <RevealSection delay={400}>
            <Grid container spacing={2} sx={{ mt: 2 }}>
              {[
                { label: 'TLS 1.2/1.3', desc: "Let's Encrypt auto-renewal" },
                { label: 'Rate Limiting', desc: 'Per-route limits (login, bulk)' },
                { label: 'User-Agent Routing', desc: 'Desktop → :3000, Mobile → :4000' },
                { label: 'Health Checks', desc: 'All services report readiness' },
              ].map((item, i) => (
                <Grid item xs={6} sm={3} key={item.label}>
                  <Paper elevation={0} sx={{
                    p: 2, borderRadius: 2, textAlign: 'center',
                    border: '1px solid', borderColor: 'divider',
                  }}>
                    <CheckCircle sx={{ color: '#4CAF50', fontSize: 24, mb: 0.5 }} />
                    <Typography variant="subtitle2" fontWeight={600}>{item.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </RevealSection>
        </Box>

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  SECTION 7 — CLOSING                                       */}
        {/* ════════════════════════════════════════════════════════════ */}
        <Box ref={el => sectionRefs.current[7] = el} sx={{ pb: 8, scrollMarginTop: '80px' }}>
          <RevealSection>
            <Box sx={{
              textAlign: 'center', py: 8,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha('#4CAF50', 0.05)} 100%)`,
              borderRadius: 4,
            }}>
              <Verified sx={{ fontSize: 56, color: '#4CAF50', mb: 2 }} />
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Production Ready
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}>
                SkyrakSys HRM is fully tested, containerized, and hardened for production deployment.
                Built with security-first principles and modern engineering practices.
              </Typography>

              <Grid container spacing={3} sx={{ maxWidth: 800, mx: 'auto' }}>
                {[
                  { label: 'Migrations', value: '25 versioned', icon: <Storage /> },
                  { label: 'Middleware', value: '19-step pipeline', icon: <Shield /> },
                  { label: 'Services', value: '24 business + data', icon: <AccountTree /> },
                  { label: 'Test Coverage', value: '79 E2E scenarios', icon: <Verified /> },
                ].map((stat, i) => (
                  <Grid item xs={6} sm={3} key={stat.label}>
                    <RevealSection delay={i * 150}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Avatar sx={{
                          width: 48, height: 48, mx: 'auto', mb: 1,
                          bgcolor: alpha('#4CAF50', 0.1), color: '#4CAF50',
                        }}>
                          {stat.icon}
                        </Avatar>
                        <Typography variant="subtitle2" fontWeight={600}>{stat.value}</Typography>
                        <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                      </Box>
                    </RevealSection>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </RevealSection>
        </Box>

        {/* Footer */}
        <Divider sx={{ mb: 4 }} />
        <Box sx={{ textAlign: 'center', pb: 4 }}>
          <Typography variant="caption" color="text.secondary">
            SkyrakSys HRM v2.0 — Architecture Showcase — Built with React + Material-UI
          </Typography>
        </Box>

      </Container>
    </Box>
  );
}
