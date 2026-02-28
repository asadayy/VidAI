import Invitation from '../models/Invitation.model.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { logger } from '../config/logger.js';

/**
 * Helper: call AI microservice for invitation generation
 */
const callAIService = async (endpoint, body) => {
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

    try {
        const response = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(120000), // 2 mins timeout
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `AI service error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        logger.error(`AI service error at ${endpoint}:`, error.message);
        throw error;
    }
};

/**
 * @route   POST /api/v1/invitations/generate
 * @desc    Generate digital invitation content using AI
 * @access  Private
 */
export const generateInvitation = asyncHandler(async (req, res) => {
    const { essentials, style, tone } = req.body;

    if (!essentials || !style || !tone) {
        const error = new Error('All parameters (essentials, style, tone) are required.');
        error.statusCode = 400;
        throw error;
    }

    try {
        // Call AI service to get generated content
        const aiResponse = await callAIService('/api/v1/invitations/generate', {
            essentials,
            style,
            tone,
            userId: req.user._id.toString()
        });

        // Create a draft invitation in DB
        const invitation = await Invitation.create({
            user: req.user._id,
            title: `Wedding Invitation - ${essentials.names}`,
            content: {
                names: essentials.names,
                date: new Date(essentials.date),
                time: essentials.time,
                venue: {
                    name: essentials.venueName,
                    city: essentials.venueCity,
                    mapLink: essentials.mapLink || ''
                }
            },
            style: {
                theme: style.theme,
                colorPalette: style.colorPalette,
                orientation: style.orientation,
                imagery: style.imagery
            },
            tone: tone,
            generatedContent: aiResponse.data.generatedContent,
            status: 'draft'
        });

        res.status(201).json({
            success: true,
            data: invitation
        });
    } catch (error) {
        logger.error('Invitation Generation Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to generate invitation content.'
        });
    }
});

/**
 * @route   GET /api/v1/invitations
 * @desc    Get all user invitations
 * @access  Private
 */
export const getMyInvitations = asyncHandler(async (req, res) => {
    const invitations = await Invitation.find({ user: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: invitations.length,
        data: invitations
    });
});

/**
 * @route   GET /api/v1/invitations/:id
 * @desc    Get single invitation
 * @access  Private/Public (if isPublic)
 */
export const getInvitation = asyncHandler(async (req, res) => {
    const invitation = await Invitation.findById(req.params.id);

    if (!invitation) {
        const error = new Error('Invitation not found.');
        error.statusCode = 404;
        throw error;
    }

    // Check if public or owned by user
    if (!invitation.isPublic && invitation.user.toString() !== req.user?._id?.toString()) {
        // If user is not logged in and it's not public, or if logged in but not owner
        const error = new Error('Not authorized to view this invitation.');
        error.statusCode = 403;
        throw error;
    }

    res.status(200).json({
        success: true,
        data: invitation
    });
});

/**
 * @route   PATCH /api/v1/invitations/:id
 * @desc    Update invitation (save/publish)
 * @access  Private
 */
export const updateInvitation = asyncHandler(async (req, res) => {
    let invitation = await Invitation.findById(req.params.id);

    if (!invitation) {
        const error = new Error('Invitation not found.');
        error.statusCode = 404;
        throw error;
    }

    if (invitation.user.toString() !== req.user._id.toString()) {
        const error = new Error('Not authorized to update this invitation.');
        error.statusCode = 403;
        throw error;
    }

    invitation = await Invitation.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: invitation
    });
});

/**
 * @route   DELETE /api/v1/invitations/:id
 * @desc    Delete invitation
 * @access  Private
 */
export const deleteInvitation = asyncHandler(async (req, res) => {
    const invitation = await Invitation.findById(req.params.id);

    if (!invitation) {
        const error = new Error('Invitation not found.');
        error.statusCode = 404;
        throw error;
    }

    if (invitation.user.toString() !== req.user._id.toString()) {
        const error = new Error('Not authorized to delete this invitation.');
        error.statusCode = 403;
        throw error;
    }

    await invitation.deleteOne();

    res.status(200).json({
        success: true,
        data: {}
    });
});
