import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';

dotenv.config();

const cleanupAdmins = async () => {
    const mainAdminEmail = 'admin@vidai.pk';

    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in .env');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB Atlas...');

        // Delete all admins EXCEPT the main one
        const result = await User.deleteMany({
            role: 'admin',
            email: { $ne: mainAdminEmail }
        });

        console.log('--- ADMIN CLEANUP COMPLETE ---');
        console.log(`Successfully deleted ${result.deletedCount} extra admin accounts.`);
        console.log(`Kept main admin: ${mainAdminEmail}`);
        console.log('-------------------------------');

    } catch (error) {
        console.error('Error during cleanup:', error.message);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

cleanupAdmins();
