const socketIo = require('socket.io');
const roomAPI = require('./room');
const Utils = require('../../utils');
const AuthService = require('../../services/auth');
const e = require('express');

// Set up the socket server
class RoomService {
    constructor(server, path) {
        this.io = socketIo(server, { path });
        this.io.on('connection', socket => this.onConnection(socket));
    
        this.io.listen(process.env.SOCKET_PORT);

        // Tracks the active rooms handled by the server
        this.activeRoomsByID = {};
        // Tracks the active sockets handled by the server
        this.activeSocketsByID = {};
    }

    /**
     * Checks if the user is authorized via the server to take an action.
     */
    checkIfUserAuthorized(uid, authToken, socket, eventInfoOnError) {
        if (AuthService.validateToken(authToken, uid)) {
            return true;
        } else {
            this.emitUserEvent('not_authorized', socket, eventInfoOnError);
            return false;
        }
    }

    /**
     * Checks if the user is authorized for a room if a UID is not passed to the event.
     * Cannot be used for actions if the user is outside of the room itself and thus may
     * be connecting via a different socket.
     * 
     * Example: A host kicking a user from a room can only happen if the host is currently connected to the room.
     */
    checkIfUserAuthorizedForRoom(room, authToken, socket, eventInfoOnError) {
        const uid = room.getUIDFromSocket(socket);
        if (uid && room.hostUID === uid && AuthService.validateToken(authToken, uid)) {
            return true;
        } else {
            this.emitUserEvent('not_authorized', socket, eventInfoOnError);
            return false;
        }
    }

    /**
     * Checks if the user is authorized for a room if a UID is passed to the event.
     * Can be used for actions even if the user is outside of the room itself and if they
     * may be connecting via different socket.
     * 
     * Example: Closing a room may take place even if the host is not currently connected to the room.
     */
    checkIfUserAuthorizedForRoomGivenUID(room, authToken, uid, socket, eventInfoOnError) {
        if (room.hostUID === uid && AuthService.validateToken(authToken, uid)) {
            return true;
        } else {
            this.emitUserEvent('not_authorized', socket)
        }
    }

    /**
     * Emit an event to the specified socket.
     */
    emitUserEvent(event, socket, eventInfo) {
        this.io.to(socket.id).emit(event, eventInfo);
    }

    /**
     * Handle a new connection to the room service socket (not a room
     * itself).
     */
    onConnection(socket) {
        Utils.DebugLog('New Connection!');
        this.activeSocketsByID[socket.id] = { socket };
        // Handle a user disconnecting from the room service socket.
        socket.on('disconnect', () => this.onDisconnect(socket));
        // Handle a user joining the room.
        socket.on('join_room', eventInfo => this.clientJoinRoomEvent(eventInfo, socket));
        // Handle a user voting on an option.
        socket.on('user_vote', eventInfo => this.clientVoteEvent(eventInfo, socket));
        // Handle a user cancelling their vote.
        socket.on('user_cancel_vote', eventInfo => this.clientCancelVoteEvent(eventInfo, socket));
        // Handle a user creating a room. (Host)
        socket.on('create_room', eventInfo => this.clientStartRoomEvent(eventInfo, socket));
        // Handle a user closing a room. (Host)
        socket.on('close_room', eventInfo => this.clientCloseRoomEvent(eventInfo, socket));
        // Handle a user kicking another user from a room. (Host)
        socket.on('kick_user', eventInfo => this.clientKickUserEvent(eventInfo, socket));
        // Handle a user starting a new round of voting. (Host)
        socket.on('start_new_round', eventInfo => this.clientStartNewRoundEvent(eventInfo, socket));
        // Handle a user forcing the round to be over. (Host)
        socket.on('force_end_bidding', eventInfo => this.clientForceEndBidding(eventInfo, socket));
    }

    /**
     * Handle a user disconnecting from the room service socket.
     * 
     * TODO: Handle if host disconnects from active room; it should close the room in that case.
     */
    onDisconnect(socket) {
        try {
            // Remove the user from their connected room if they were in a room
            const connectedRoomID = this.activeSocketsByID[socket.id].connectedTo;
            if (
                connectedRoomID
                && this.activeRoomsByID[connectedRoomID]
            ) {
                const room = this.activeRoomsByID[connectedRoomID];
                room.disconnectUserFromRoom(socket);
            }
            // Remove the socket info from the activeSocketsByID list
            delete this.activeSocketsByID[socket.id];
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Create the room and set it in the list of active rooms by ID
     */
    createRoom(roomID, roomConfig, hostUID) {
        this.activeRoomsByID[roomID] = new roomAPI.Room(this.io, roomID, roomConfig, hostUID);
    }

    /**
     * Helper function to close a room
     */
    closeRoom(room) {
        // Disconnect all users from the room and send them a message.
        room.disconnectAllUsers();
        // Delete the room from the list of active rooms
        delete this.activeRoomsByID[room.roomID];
    }

    /**
     * Have the user join the correct room if it exists and is active.
     */
    clientJoinRoomEvent(eventInfo, socket) {
        if (
            !eventInfo.roomID
            || !eventInfo.nickname
            || !eventInfo.uid
        ) {
            Utils.DebugLog('Invalid event info passed to clientJoinRoomEvent.');
            return;
        }
        try {
            // If the specified roomID is not in the list of active rooms, we cannot join. Emit an error event.
            if (!this.activeRoomsByID[eventInfo.roomID]) {
                this.emitUserEvent('room_inactive', socket);
            } else {
                // Construct the user object to pass to the room
                const user = {
                    nickname: eventInfo.nickname,
                    socketID: socket.id,
                    uid: eventInfo.uid,
                }
                // Grab the correct room from the list of active rooms
                const room = this.activeRoomsByID[eventInfo.roomID];
                // Join the user to the room
                room.joinUserToRoom(user);
                // Update the socket info
                this.activeSocketsByID[socket.id].connectedTo = eventInfo.roomID;
            }
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Have the user create a room if it doesn't already exist. Does not join the user to the room.
     */
    clientStartRoomEvent(eventInfo, socket) {
        if (
            !eventInfo.roomID
            || !eventInfo.roomConfig
            || !eventInfo.uid
            || !eventInfo.authToken
        ) {
            Utils.DebugLog('Invalid event info passed to clientStartRoomEvent.');
            return;
        }
        try {
            // First we need to check if the user is authorized for this action.
            if (!this.checkIfUserAuthorized(
                eventInfo.uid, eventInfo.authToken, socket,
                {
                    "title": "Failed to Create Room",
                    "message": "We could not authorize your attempt to create a room."
                }
            )) {
                return;
            }
            // If the specified roomID is already in the list of active rooms, we do not want to start another. Emit an error event.
            if (this.activeRoomsByID[eventInfo.roomID]) {
                this.emitUserEvent('room_already_created', socket);
            } else {
                // Create the new room and store the info in the list of rooms
                this.createRoom(eventInfo.roomID, eventInfo.roomConfig, eventInfo.uid);
                // Emit a create_success event to the host
                this.emitUserEvent('create_success', socket);
            }
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Have the user close the specified room.
     */
    clientCloseRoomEvent(eventInfo, socket) {
        if (
            !eventInfo.roomID
            || !eventInfo.uid
            || !eventInfo.authToken
        ) {
            Utils.DebugLog('Invalid event info passed to clientCloseRoomEvent.');
            return;
        }
        try {
            // Grab the correct room from the list of active rooms
            const room = this.activeRoomsByID[eventInfo.roomID];
            // If the specified roomID is not in the list of active rooms, we cannot close the room. Emit an error event.
            if (!room) {
                this.emitUserEvent('host_room_closed_failure', socket);
                return;
            }
            // Check if the user is authorized as the host of a room.
            if (!this.checkIfUserAuthorizedForRoomGivenUID(
                room, eventInfo.authToken, eventInfo.uid, socket,
                {
                    "title": "Failed to Close Room",
                    "message": "We could not authorize your attempt to close this room."
                }
            )) {
                return;
            }
            // If we made it to this point, we can close the specified room.
            this.closeRoom(room);
            // Emit a success message
            this.emitUserEvent('host_room_closed_success', socket);
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Have the user kick another user from the specified room.
     */
    clientKickUserEvent(eventInfo, socket) {
        if (
            !eventInfo.roomID
            || !eventInfo.user
            || !eventInfo.authToken
        ) {
            Utils.DebugLog('Invalid event info passed to clientKickUserEvent.');
            return;
        }
        try {
            // Make sure the room is active.
            const room = this.activeRoomsByID[eventInfo.roomID];
            if (!room) {
                return;
            }
            // Make sure the user is authorized to take this action
            if (!this.checkIfUserAuthorizedForRoom(
                room, eventInfo.authToken, socket,
                {
                    "title": "Failed to Kick User",
                    "message": "We could not authorize your attempt to kick that user."
                }
            )) {
                return;
            }
            // If we made it to here, we can kick the user from the room
            room.kickUser(eventInfo.user);
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Have the user vote in the specified room.
     */
    clientVoteEvent(eventInfo, socket) {
        if (
            !eventInfo.roomID
            || eventInfo.cardIndex === null
        ) {
            Utils.DebugLog('Invalid event info passed to clientVoteEvent.');
            return;
        }
        try {
            // Make sure the room is active.
            const room = this.activeRoomsByID[eventInfo.roomID];
            if (room) {
                // Have the user vote in the room
                room.userVote(eventInfo.cardIndex, socket);
            }
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Have the user cancel their vote in the specified room.
     */
    clientCancelVoteEvent(eventInfo, socket) {
        if (!eventInfo.roomID) {
            Utils.DebugLog('Invalid event info passed to clientCancelVoteEvent.');
            return;
        }
        try {
            // Make sure the room is active.
            const room = this.activeRoomsByID[eventInfo.roomID];
            if (room) {
                // Cancel the user's vote in the room
                room.userCancelVote(socket);
            }
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Have the user start a new round of voting in the specified room.
     */
    clientStartNewRoundEvent(eventInfo, socket) {
        if (
            !eventInfo.roomID
            || !eventInfo.authToken
        ) {
            Utils.DebugLog('Invalid event info passed to clientStartNewRoundEvent.');
            return;
        }
        try {
            // Make sure the room is active.
            const room = this.activeRoomsByID[eventInfo.roomID];
            if (!room) {
                return;
            }
            // Make sure the user is authorized as the host of the room
            if (!this.checkIfUserAuthorizedForRoom(
                room, eventInfo.authToken, socket,
                {
                    "title": "Failed to Start New Round",
                    "message": "We could not authorize your attempt to start a new round."
                }
            )) {
                return;
            }
            // If we made it to here, we can start a new round of voting in the room.
            room.startNewRound();
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Have the user force end bidding in the specified room and proceed to the
     * results phase.
     */
    clientForceEndBidding(eventInfo, socket) {
        if (
            !eventInfo.roomID
            || !eventInfo.authToken
        ) {
            Utils.DebugLog('Invalid event info passed to clientForceEndBidding.');
            return;
        }
        try {
            // Make sure the room is active.
            const room = this.activeRoomsByID[eventInfo.roomID];
            if (!room) {
                return;
            }
            // Make sure the user is authorized as the host of the room
            if (!this.checkIfUserAuthorizedForRoom(
                room, eventInfo.authToken, socket,
                {
                    "title": "Failed to Force End Bidding",
                    "message": "We could not authorize your attempt to force the bidding round to end."
                }
            )) {
                return;
            }
            // If we made it to here, we can force end bidding in the room
            room.forceEndBidding();
        } catch (err) {
            console.log(err);
        }
    }
}

module.exports.RoomService = RoomService;
