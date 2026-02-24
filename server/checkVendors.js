import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Vendor from './src/models/Vendor.model.js';

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to DB');
        const vendors = await Vendor.find({});
        console.log('Total vendors:', vendors.length);
        if (vendors.length > 0) {
            console.log('Sample vendor name:', vendors[0].businessName);
            console.log('Sample vendor verificationStatus:', vendors[0].verificationStatus);
            console.log('Sample vendor isActive:', vendors[0].isActive);
            console.log('Sample vendor prices:', vendors[0].startingPrice);
            console.log('Sample vendor location:', vendors[0].location);
        }
        const approved = await Vendor.find({ verificationStatus: 'approved' });
        console.log('Approved vendors:', approved.length);
        const approvedActive = await Vendor.find({ verificationStatus: 'approved', isActive: true });
        console.log('Approved and active vendors:', approvedActive.length);
        const searchMatch = await Vendor.find({ verificationStatus: 'approved', isActive: true, city: { $regex: 'Lahore', $options: 'i' } });
        console.log('Search match for Lahore:', searchMatch.length);
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
