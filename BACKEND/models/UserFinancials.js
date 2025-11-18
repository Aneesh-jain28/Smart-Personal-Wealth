const mongoose = require('mongoose');

const userFinancialsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        unique: true
    },
    accounts: [{
        name: {
            type: String,
            required: [true, 'Account name is required'],
            trim: true
        },
        type: {
            type: String,
            enum: {
                values: ['savings', 'investment', 'debt'],
                message: 'Type must be either savings, investment, or debt'
            },
            required: [true, 'Account type is required']
        },
        balance: {
            type: Number,
            required: [true, 'Balance is required'],
            default: 0
        },
        annualGrowthRate: {
            type: Number,
            required: [true, 'Annual growth rate is required'],
            default: 0
        },
        standardDeviation: {
            type: Number,
            default: 0
        },
        taxTreatment: {
            type: String,
            enum: {
                values: ['taxable', 'deferred', 'exempt'],
                message: 'Tax treatment must be taxable, deferred, or exempt'
            },
            default: 'taxable'
        },
        interestRate: {
            type: Number,
            default: 0
        },
        minimumPayment: {
            type: Number,
            default: 0
        },
        currency: {
            type: String,
            enum: {
                values: ['USD', 'EUR', 'GBP', 'INR', 'BTC', 'ETH'],
                message: 'Currency must be USD, EUR, GBP, INR, BTC, or ETH'
            },
            default: 'USD'
        }
    }],
    scenarios: [{
        label: {
            type: String,
            required: [true, 'Scenario label is required'],
            trim: true
        },
        type: {
            type: String,
            enum: {
                values: ['one-time-expense', 'income-change'],
                message: 'Type must be either one-time-expense or income-change'
            },
            required: [true, 'Scenario type is required']
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required']
        },
        startYear: {
            type: Number,
            required: [true, 'Start year is required']
        },
        isRecurring: {
            type: Boolean,
            default: false
        },
        frequency: {
            type: String,
            enum: {
                values: ['monthly', 'annually'],
                message: 'Frequency must be monthly or annually'
            },
            default: 'annually'
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('UserFinancials', userFinancialsSchema);
