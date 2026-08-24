import { DndContext, useDraggable, useDroppable, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'; import items from './assets/items.json';
import { useState, useEffect } from 'react';
import paperDollBg from './assets/paper-doll.png';
import slots from './assets/slots.json';

const AVAILABLE_ITEMS = items.availableItems;

const INITIAL_SLOTS = {
  paperDoll: slots.slots,
  backpack: Array.from({ length: 10 }, (_, i) => ({
    id: `backpack_${i + 1}`,
    label: `Backpack ${i + 1}`,
    isWound: false,
    item: null,
    blockedBy: null
  }))
};

// --- COMPONENTES AUXILIARES ---
function InventoryDraggableItem({ item, sourceSlotId, onRemove, onClick, isSelected }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `inv_${sourceSlotId}`,
    data: { ...item, sourceSlotId }
  });

  const opacity = isDragging ? 'opacity-0' : 'opacity-100';
  // Feedback visual para o item selecionado pelo clique
  const selectionStyle = isSelected ? 'ring-2 ring-blue-500 scale-105 z-20' : 'border-amber-500 hover:bg-neutral-600';

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation(); // Impede que o clique vaze para o slot atrás da carta
        onClick(item, sourceSlotId);
      }}
      className={`relative w-full h-full flex flex-col items-center justify-center bg-neutral-700 rounded p-1 text-center border-2 cursor-grab transition-all shadow-md ${opacity} ${selectionStyle}`}
    >
      <span className="text-xs font-bold text-white truncate w-full">{item.name}</span>

      <button
        onPointerDown={(e) => {
          e.stopPropagation();
          onRemove(sourceSlotId);
        }}
        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold hover:bg-red-500 z-10"
      >
        X
      </button>
    </div>
  );
}

function DraggableCard({ item, onClick, isSelected }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `item_${item.id}`,
    data: item
  });

  const opacity = isDragging ? 'opacity-30' : 'opacity-100';
  const selectionStyle = isSelected ? 'ring-2 ring-blue-500 scale-105' : 'border-neutral-700 hover:bg-neutral-750';

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onClick(item)}
      className={`bg-neutral-800 border rounded-lg p-3 cursor-grab shadow-lg transition-all ${opacity} ${selectionStyle}`}
    >
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-bold text-sm text-neutral-200">{item.name}</h3>
        <span className="text-xs font-mono bg-neutral-950 px-2 py-1 rounded text-neutral-400">
          {item.slots} {item.slots > 1 ? 'slots' : 'slot'}
        </span>
      </div>
      <div className="flex justify-between items-end text-xs text-neutral-500">
        <span>{item.category}</span>
        <span>{item.cost}</span>
      </div>
    </div>
  );
}

function DroppableSlot({ id, slotData, className, style, onRemove, onItemClick, onSlotClick, selectedItem }) {
  const { isOver, setNodeRef } = useDroppable({ id: id });

  // Se houver um item selecionado na "mão" do jogador, mostramos que o slot é clicável
  const isTargetable = selectedItem && !slotData.item && !slotData.blockedBy;

  const borderStyle = isOver ? 'border-green-500 bg-neutral-700/50' :
    isTargetable ? 'border-blue-500/50 cursor-pointer hover:bg-blue-900/20' :
      'border-neutral-600';

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSlotClick(id)}
      className={`${className} ${borderStyle} transition-colors`}
    >
      {slotData.item ? (
        <InventoryDraggableItem
          item={slotData.item}
          sourceSlotId={id}
          onRemove={onRemove}
          onClick={onItemClick}
          isSelected={selectedItem?.sourceSlotId === id}
        />
      ) : slotData.blockedBy ? (
        <div className="w-full h-full flex items-center justify-center bg-neutral-800/80 rounded border border-neutral-600/50">
          <span className="text-[10px] text-neutral-600 italic">Ocupado</span>
        </div>
      ) : (
        <span className="text-xs text-neutral-400 font-medium pointer-events-none">{slotData.label}</span>
      )}
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  // 1. Inicialização inteligente: Busca no LocalStorage primeiro
  const [slots, setSlots] = useState(() => {
    const savedSlots = localStorage.getItem('crows_inventory');
    if (savedSlots) {
      try {
        return JSON.parse(savedSlots); // Retorna o que estava salvo
      } catch (error) {
        console.error("Erro ao ler o localStorage:", error);
      }
    }
    return INITIAL_SLOTS; // Se não tiver nada salvo (ou der erro), usa o JSON padrão
  });

  // 2. Salvamento Automático: Toda vez que 'slots' mudar, salva no navegador
  useEffect(() => {
    localStorage.setItem('crows_inventory', JSON.stringify(slots));
  }, [slots]); const [searchTerm, setSearchTerm] = useState("");
  const [activeItem, setActiveItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // NOVO: Configurando a sensibilidade do mouse/touch
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // O arraste só começa se o cursor mover 5 pixels
      },
    })
  );
  const filteredItems = AVAILABLE_ITEMS.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRemoveItem = (sourceSlotId) => {
    setSlots((prevSlots) => {
      const newSlots = { ...prevSlots };
      const clearCategory = (category) => {
        newSlots[category] = newSlots[category].map(slot => {
          if (slot.id === sourceSlotId) return { ...slot, item: null };
          if (slot.blockedBy === sourceSlotId) return { ...slot, blockedBy: null };
          return slot;
        });
      };
      clearCategory('paperDoll');
      clearCategory('backpack');
      return newSlots;
    });
    // Limpa a seleção caso o usuário delete o item que estava selecionado
    if (selectedItem?.sourceSlotId === sourceSlotId) {
      setSelectedItem(null);
    }
  };

  // --- O NOVO CÉREBRO COMPARTILHADO ---
  // Função que executa a lógica e retorna true (sucesso) ou false (falha)
  const processItemMovement = (movingItem, targetSlotId) => {
    const isBackpack = targetSlotId.startsWith('backpack_');
    const isHand = targetSlotId.startsWith('hand_');
    const isBelt = targetSlotId.startsWith('belt_');

    const slotsNeeded = isBackpack ? movingItem.slots : isHand ? movingItem.handSlots : movingItem.equippedSlots;
    let targetSlotIds = [];

    if (isBackpack) {
      const num = parseInt(targetSlotId.split('_')[1], 10);
      for (let i = 0; i < slotsNeeded; i++) targetSlotIds.push(`backpack_${num + (i * 2)}`);
    } else if (isHand && slotsNeeded > 1) {
      targetSlotIds = ['hand_1', 'hand_2'];
    } else if (isBelt) {
      const num = parseInt(targetSlotId.split('_')[1], 10);
      for (let i = 0; i < slotsNeeded; i++) targetSlotIds.push(`belt_${num + i}`);
    } else {
      targetSlotIds = [targetSlotId];
    }

    const allSlots = [...slots.paperDoll, ...slots.backpack];
    let isValid = true;
    const sourceSlotId = movingItem.sourceSlotId;

    for (const id of targetSlotIds) {
      const slot = allSlots.find(s => s.id === id);
      const isOccupiedBySelf = sourceSlotId && (slot.id === sourceSlotId || slot.blockedBy === sourceSlotId);

      if (!slot || (!isOccupiedBySelf && (slot.item !== null || slot.blockedBy !== null))) {
        isValid = false;
        break;
      }
    }

    if (!isValid) return false;

    setSlots((prevSlots) => {
      const newSlots = { ...prevSlots };
      const updateSlots = (category) => {
        newSlots[category] = newSlots[category].map(slot => {
          if (sourceSlotId && (slot.id === sourceSlotId || slot.blockedBy === sourceSlotId)) {
            slot = { ...slot, item: null, blockedBy: null };
          }
          if (slot.id === targetSlotId) {
            const { sourceSlotId: _, ...cleanItem } = movingItem;
            return { ...slot, item: cleanItem, blockedBy: null };
          }
          else if (targetSlotIds.includes(slot.id)) {
            return { ...slot, item: null, blockedBy: targetSlotId };
          }
          return slot;
        });
      };
      updateSlots('paperDoll');
      updateSlots('backpack');
      return newSlots;
    });

    return true; // Sucesso
  };

  // --- HANDLERS DO CLICK-TO-MOVE ---
  const handleItemClick = (item, sourceSlotId = null) => {
    // Se clicar no mesmo item já selecionado, desmarca. Senão, marca o novo.
    if (selectedItem && selectedItem.id === item.id && selectedItem.sourceSlotId === sourceSlotId) {
      setSelectedItem(null);
    } else {
      setSelectedItem({ ...item, sourceSlotId });
    }
  };

  const handleSlotClick = (targetSlotId) => {
    if (!selectedItem) return; // Se não tem nada na mão, ignora

    const success = processItemMovement(selectedItem, targetSlotId);
    if (success) {
      setSelectedItem(null); // Limpa a "mão" virtual após alocar com sucesso
    } else {
      console.log("Movimento inválido via clique.");
    }
  };

  // --- HANDLERS DO DRAG AND DROP ---
  const handleDragStart = (event) => {
    setActiveItem(event.active.data.current);
    setSelectedItem(null); // Limpa qualquer clique anterior se o usuário decidir arrastar
  };

  const handleDragEnd = (event) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;

    processItemMovement(active.data.current, over.id);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>      {/* Container principal engloba um onClick global para cancelar a seleção se clicar no fundo vazio */}
      <div
        className="min-h-screen bg-neutral-900 text-white p-8 font-sans"
        onClick={() => setSelectedItem(null)}
      >
        <header className="mb-8 border-b border-neutral-800 pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold">Cards Inventory</h1>
            <p className="text-neutral-400">Organize your stuff</p>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear the inventory?')) {
                setSlots(INITIAL_SLOTS);
              }
            }}
            className="text-sm px-4 py-2 bg-red-900/50 text-red-200 rounded hover:bg-red-800 transition-colors"
          >
            Clear Inventory
          </button>
        </header>

        <main className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto">
          {/* COLUNA 1: Paper Doll */}
          <section className="w-full lg:w-1/3">
            <h2 className="text-xl mb-4 font-semibold text-neutral-300">Equipped</h2>
            <div className="relative w-full max-w-sm aspect-[3/4] bg-neutral-800 rounded-lg border border-neutral-700 mx-auto">
              <img
                src={paperDollBg}
                alt="Silhueta do Personagem"
                className="absolute inset-0 w-full h-full object-contain opacity-50 pointer-events-none"
              />
              {slots.paperDoll.map((slot) => (
                <DroppableSlot
                  key={slot.id}
                  id={slot.id}
                  slotData={slot}
                  style={{ top: slot.top, left: slot.left }}
                  onRemove={handleRemoveItem}
                  onItemClick={handleItemClick}
                  onSlotClick={handleSlotClick}
                  selectedItem={selectedItem}
                  className="absolute w-16 h-20 bg-neutral-950/80 border-2 border-dashed rounded flex items-center justify-center z-10"
                />
              ))}
            </div>
          </section>

          {/* COLUNA 2: Mochila */}
          <section className="w-full lg:w-1/3">
            <h2 className="text-xl mb-4 font-semibold text-neutral-300">Backpack</h2>
            <div className="grid grid-cols-2 gap-4 relative z-10">
              {slots.backpack.map((slot) => (
                <div key={slot.id} className="relative h-24">
                  <DroppableSlot
                    id={slot.id}
                    slotData={slot}
                    onRemove={handleRemoveItem}
                    onItemClick={handleItemClick}
                    onSlotClick={handleSlotClick}
                    selectedItem={selectedItem}
                    className="absolute inset-0 bg-neutral-800 border-2 border-dashed rounded-lg p-2 flex flex-col justify-between"
                  />
                  <span className="absolute bottom-2 right-2 text-xs text-red-900/50 font-bold tracking-widest pointer-events-none">
                    {/* WOUND () */}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* COLUNA 3: Catálogo de Cartas */}
          <section
            className="w-full lg:w-1/3 flex flex-col h-[80vh]"
            onClick={(e) => e.stopPropagation()} // Impede que clicar nesta coluna desmarque o item
          >
            <h2 className="text-xl mb-4 font-semibold text-neutral-300">Available Items</h2>

            <input
              type="text"
              placeholder="Search item or category..."
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-2 mb-4 text-white focus:outline-none focus:border-neutral-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-8">
              {filteredItems.map(item => (
                <DraggableCard
                  key={item.id}
                  item={item}
                  onClick={handleItemClick}
                  isSelected={selectedItem && !selectedItem.sourceSlotId && selectedItem.id === item.id}
                />
              ))}
            </div>
          </section>
        </main>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="bg-neutral-800 border-2 border-amber-500 rounded-lg p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] scale-105 cursor-grabbing opacity-90 w-64">
            <h3 className="font-bold text-sm text-neutral-200">{activeItem.name}</h3>
            <span className="text-xs text-neutral-400">Dragging...</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}