import { Socket, Server } from "socket.io";
import { v4 as uuidV4 } from "uuid";

const rooms: Record<string, Record<string, IUser>> = {};
const chats: Record<string, IMessage[]> = {};
interface IUser {
    peerId: string;
    userName: string;
}
interface IRoomParams {
    meetId: string;
    peerId: string;
}

interface IJoinRoomParams extends IRoomParams {
    userName: string;
}
interface IMessage {
    content: string;
    author?: string;
    timestamp: number;
}

export const roomHandler = (socket: Socket, io: Server) => {
    const createRoom = () => {
        const meetId = uuidV4().split('-')[0];
        rooms[meetId] = {};
        socket.emit("room-created", { meetId });
        console.log("user created the room");
    };

    const joinRoom = ({ meetId, peerId, userName }: IJoinRoomParams) => {
        if (!rooms[meetId]) rooms[meetId] = {};
        if (!chats[meetId]) chats[meetId] = [];
        socket.emit("get-messages", chats[meetId]);
        console.log("user joined the room", meetId, peerId, userName);
        rooms[meetId][peerId] = { peerId, userName };
        socket.join(meetId);
        socket.to(meetId).emit("user-joined", { peerId, userName });
        socket.emit("get-users", {
            meetId,
            participants: rooms[meetId],
        });

        socket.on("disconnect", () => {
            console.log("user left the room", peerId);
            leaveRoom({ meetId, peerId });
        });
    };

    const leaveRoom = ({ peerId, meetId }: IRoomParams) => {
        // rooms[meetId] = rooms[meetId]?.filter((id) => id !== peerId);
        socket.to(meetId).emit("user-disconnected", peerId);
    };

    const startSharing = ({ peerId, meetId }: IRoomParams) => {
        console.log({ meetId, peerId });
        socket.to(meetId).emit("user-started-sharing", peerId);
    };

    const stopSharing = (meetId: string) => {
        socket.to(meetId).emit("user-stopped-sharing");
    };

    const addMessage = (meetId: string, message: IMessage) => {
        console.log({ message });
        if (chats[meetId]) {
            chats[meetId].push(message);
        } else {
            chats[meetId] = [message];
        }
        socket.to(meetId).emit("add-message", message);
    };

    const changeName = ({
        peerId,
        userName,
        meetId,
    }: {
        peerId: string;
        userName: string;
        meetId: string;
    }) => {
        if (rooms[meetId] && rooms[meetId][peerId]) {
            rooms[meetId][peerId].userName = userName;
            socket.to(meetId).emit("name-changed", { peerId, userName });
        }
    };

    const checkMeetValidity = ({ linkValue }: { linkValue: string }) => {
        const meet = rooms[linkValue]
        io.emit("is-valid", { success: meet ? true : false })
    }

    socket.on("create-room", createRoom);
    socket.on("check-meet-validity", checkMeetValidity);
    socket.on("join-room", joinRoom);
    socket.on("start-sharing", startSharing);
    socket.on("stop-sharing", stopSharing);
    socket.on("send-message", addMessage);
    socket.on("change-name", changeName);
};
