'use client';
import React from 'react'
import { useDragControls } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { IconGripVertical, IconPlus, IconTrash, IconUser } from '@tabler/icons-react';
import { Reorder } from 'framer-motion';
import { cn, PLAYER_COLORS } from '@/lib/utils';
import { PlayerInit } from '@/types/darts';
import { nanoid } from 'nanoid';

const PlayerList = ({
    playersList = [],
    setPlayersList,
}: {
    playersList: PlayerInit[];
    setPlayersList: React.Dispatch<React.SetStateAction<PlayerInit[]>>;
}) => {

    const handleReorder = (newOrder: PlayerInit[]) => {
        setPlayersList(newOrder.map(p => ({ id: p.id, name: p.name })));
    };

    const handleAddPlayer = () => {
        setPlayersList(prev => [
            ...prev,
            {
                id: nanoid(),
            },
        ]);
    };

    const handlePlayerNameChange = (index: number, name: string) => {
        const newPlayersList = [...playersList];
        newPlayersList[index] = { id: newPlayersList[index].id, name };
        setPlayersList(newPlayersList);
    };

    const handleRemovePlayer = (index: number) => {
        const newPlayersList = [...playersList];
        newPlayersList.splice(index, 1);
        setPlayersList(newPlayersList);
    };

    return (
        <div className="flex-1">
            <div className="flex items-center gap-2 justify-between">
                <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Players
                </label>
                <Button variant="ghost" size="sm" className="shrink-0" onClick={handleAddPlayer}>
                    <IconPlus /> Add Player
                </Button>
            </div>

            <Reorder.Group axis="y" values={playersList} onReorder={handleReorder} className="flex flex-col gap-2 mt-2">
                {
                    playersList.map((player, index) => {
                        player.color = PLAYER_COLORS[index % PLAYER_COLORS.length];
                        return (
                            <PlayerItem
                                key={player.id}
                                player={player}
                                index={index}
                                handlePlayerNameChange={handlePlayerNameChange}
                                handleRemovePlayer={handleRemovePlayer}
                                playersCount={playersList.length}
                            />
                        )
                    })
                }
            </Reorder.Group>

        </div>
    )
}

export default PlayerList

const PlayerItem = ({
    player,
    index,
    handlePlayerNameChange,
    handleRemovePlayer,
    playersCount
}: {
    player: PlayerInit;
    index: number;
    handlePlayerNameChange: (index: number, name: string) => void;
    handleRemovePlayer: (index: number) => void;
    playersCount: number;
}) => {
    const controls = useDragControls();

    return <Reorder.Item
        value={player}
        dragListener={false}
        dragControls={controls}
        className="relative cursor-grab active:cursor-grabbing"
    >
        <div
            className={cn("group w-full overflow-hidden rounded-xl border-2 bg-card/40 backdrop-blur-md transition-all duration-200 focus-within:shadow-lg",
                "border-primary/20 focus-within:border-primary"
            )}>
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-3 pointer-events-none z-10">
                <div className="size-9 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: player.color + "33" }}>
                    <IconUser size={20} style={{ color: player.color }} />
                </div>
            </div>
            <input
                value={player.name}
                onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                placeholder={`Player ${index + 1}`}
                className={cn(
                    "w-full h-14 px-14 rounded-xl bg-transparent",
                    "border-none focus:outline-none",
                    "text-lg placeholder:text-muted-foreground/70",
                    "transition-all duration-200"
                )}
                style={{
                    paddingRight: "3.5rem"
                }}
            />
            <div className='absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 items-center'>
                {
                    playersCount > 2 ? (
                        <Button variant="ghost" size={"icon"} onClick={() => handleRemovePlayer(index)} className='rounded-full text-destructive bg-destructive/10 hover:bg-destructive/20 hover:text-destructive transition-colors'>
                            <IconTrash size={20} />
                        </Button>
                    ) : null
                }

                <Button type="button" variant="ghost" size={"icon"} className="h-10 w-10 rounded-full cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary transition-colors touch-none"
                    onPointerDown={(e) => {
                        e.preventDefault();
                        controls.start(e);
                    }}>
                    <IconGripVertical className="text-muted-foreground" size={20} />
                </Button>
            </div>
        </div>

    </Reorder.Item>
}