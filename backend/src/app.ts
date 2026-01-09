import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer, Server } from 'http';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';

// Load environment variables
dotenv.config({ path: __dirname + '/../.env' });

// Import routes
import adminRoutes from './routes/admin.routes';
import studentRoutes from './routes/student.routes';
import clubRoutes from './routes/club.routes';
import groupsRoutes from './routes/groups.routes';
import encryptionRoutes from './routes/encryption.routes';
import generalRoutes from './routes/general.routes';

// Import Socket.IO
import { SocketHandler } from './socket/socketHandler';
import socketService from './socket/socketService';

// Import KeyManager
import { KeyManager } from './utils/encryption/key-manager.utils';

// Import Cloudinary
import { initializeCloudinary } from './utils/cloudinary.utils';


class App {
    public app: Application;
    private server: Server;
    private port: string | number;
    private socketHandler!: SocketHandler;

    constructor() {
        this.app = express();
        this.server = createServer(this.app);
        this.port = process.env.PORT || 3001;

        this.connectDatabase();
        this.initializeKeyManager();
        this.initializeCloudinary();
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeSocket();
    }

    private async connectDatabase(): Promise<void> {
        const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/konnect';
        try {
            await mongoose.connect(mongoUri, {
                // useNewUrlParser and useUnifiedTopology are default in mongoose >=6
            });
            console.log('✅ Connected to MongoDB');
        } catch (error) {
            console.error('❌ MongoDB connection error:', error);
            process.exit(1);
        }
    }

    private initializeKeyManager(): void {
        try {
            KeyManager.initialize();
            console.log('🔐 KeyManager initialized successfully');
        } catch (error) {
            console.error('❌ KeyManager initialization failed:', error);
            process.exit(1);
        }
    }

    private initializeCloudinary(): void {
        try {
            initializeCloudinary();
        } catch (error) {
            console.error('❌ Cloudinary initialization failed:', error);
            // Don't exit process for Cloudinary errors, as it's not critical for basic functionality
        }
    }

    private initializeMiddlewares(): void {
        // Security middleware
        this.app.use(helmet());

        // CORS configuration
        this.app.use(cors({
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            credentials: true
        }));

        // Logging middleware
        this.app.use(morgan('combined'));

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(cookieParser());

        // Static file serving for uploads
        this.app.use('/uploads', express.static('uploads'));
    }

    private initializeRoutes(): void {
        // Authentication and user routes
        this.app.use("/api/admin", adminRoutes);
        this.app.use("/api/student", studentRoutes);
        this.app.use("/api/club", clubRoutes);
        this.app.use("/api/groups", groupsRoutes);
        // Encryption routes
        this.app.use("/api/encryption", encryptionRoutes);
        // General routes
        this.app.use("/api/general", generalRoutes);
        // Test routes for debugging

        // Socket.IO status endpoint
        this.app.get('/api/socket/status', async (req: Request, res: Response) => {
            const connectedUsers = await socketService.getConnectedUsers();
            res.json({
                message: 'Socket.IO is running',
                connectedUsers: connectedUsers.length,
                socketIds: connectedUsers
            });
        });

        // 404 handler
        this.app.use('*', (req: Request, res: Response) => {
            res.status(404).json({
                error: 'Route not found',
                message: `Cannot ${req.method} ${req.originalUrl}`
            });
        });
    }

    private initializeSocket(): void {
        this.socketHandler = new SocketHandler(this.server);
        socketService.setSocketHandler(this.socketHandler);
        console.log('🔌 Socket.IO initialized');
    }

    public listen(): void {
        this.server.listen(this.port, () => {
            console.log(`🚀 Konnect Backend Server running on port ${this.port}`);
            console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
            console.log(`🔗 API Base URL: http://localhost:${this.port}/api`);
            console.log(`⚡ Socket.IO ready for connections`);
        });
    }

    public getSocketHandler(): SocketHandler {
        return this.socketHandler;
    }
}

export default App;
