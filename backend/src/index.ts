import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import promoterRoutes from './routes/promoter.routes';
import supervisorRoutes from './routes/supervisor.routes';
import uploadRoutes from './routes/upload.routes';
import adminRoutes from './routes/admin.routes';
import industryRoutes from './routes/industry.routes';
import productRoutes from './routes/product.routes';
import industryAssignmentRoutes from './routes/industryAssignment.routes';
import photoIndustryRoutes from './routes/photoIndustry.routes';
import informationRoutes from './routes/information.routes';
import whatsappReportRoutes from './routes/whatsappReport.routes';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || [];
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // In development, allow all origins
    if (isDevelopment) {
      return callback(null, true);
    }

    // In production, check against allowed origins
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/promoters', promoterRoutes);
app.use('/api/supervisors', supervisorRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/industries', industryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/industry-assignments', industryAssignmentRoutes);
app.use('/api/photo-industries', photoIndustryRoutes);
app.use('/api/information', informationRoutes);
app.use('/api/whatsapp-reports', whatsappReportRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  const env = process.env.NODE_ENV || 'development';
  console.log(`🚀 Server running on port ${PORT} (${env})`);
  
  if (env === 'production') {
    console.log(`✅ Backend API is live and ready to receive requests`);
  } else {
    console.log(`📍 Accessible at http://localhost:${PORT} and on your local network`);
  }
});

