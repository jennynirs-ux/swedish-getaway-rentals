import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Property } from "@/hooks/useProperties";
import { useState } from "react";
import {
  Share2,
  Download,
  Home,
  MapPin,
  Wifi,
  BookOpen,
  Key,
  Info,
  LogOut,
  Heart,
  CheckSquare,
  Recycle,
  Apple,
  Package,
  Package2,
  Newspaper,
  Wine,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type BlockType = "text" | "list" | "checkbox";

interface GuidebookBlock {
  id: string;
  type: BlockType;
  title?: string;
  content?: string;
  items?: string[];
}

interface GuideSection {
  id: string;
  title: string;
  icon: React.ElementType;
  blocks: GuidebookBlock[];
  image_url?: string;
}

interface GuestGuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
}

const GuestGuideDialog = ({ isOpen, onClose, property }: GuestGuideDialogProps) => {
  const { toast } = useToast();
  const [activeIndex, setActiveIndex] = useState(0);

  // Förifyllda sektioner (inkl. Waste)
  const fixedSections: GuideSection[] = [
    {
      id: "waste",
      title: "Waste & Recycling",
      icon: Recycle,
      blocks: [
        {
          id: "b1",
          type: "text",
          content:
            "Did you know that we can be fined if not recycling correctly in Sweden? Please sort your trash carefully.",
        },
        {
          id: "b2",
          type: "list",
          title: "Sorting Guide",
          items: [
            "Food waste → bin under sink",
            "Paper packaging → blue bin",
            "Plastic packaging → yellow bin",
            "Metal packaging → red bin",
            "Clear glass packaging → container at ICA",
            "Coloured glass packaging → container at ICA",
            "Newspapers → green bin",
            "Residual waste → black bin",
          ],
        },
      ],
    },
    // ... andra sektioner här som Directions, Wifi osv
  ];

  const customSections = (property.guidebook_sections as GuideSection[]) || [];
  const allSections = fixedSections.map((section) => {
    const custom = customSections.find((s) => s.id === section.id);
    return custom ? { ...section, ...custom } : section;
  });

  // 🔹 Icon selector för Waste items
  const getWasteIcon = (item: string) => {
    if (item.includes("Food")) return Apple;
    if (item.includes("Paper")) return Package;
    if (item.includes("Plastic")) return Package2;
    if (item.includes("Metal")) return Package;
    if (item.includes("Clear glass")) return Wine;
    if (item.includes("Coloured glass")) return Wine;
    if (item.includes("Newspapers")) return Newspaper;
    if (item.includes("Residual")) return Trash2;
    return Recycle;
  };

  // 🔹 Renderare för blocks
  const renderBlock = (section: GuideSection, block: GuidebookBlock) => {
    if (block.type === "text") {
      return (
        <div className="space-y-1">
          {block.title && <h4 className="font-semibold text-foreground">{block.title}</h4>}
          <p className="text-muted-foreground whitespace-pre-wrap">{block.content}</p>
        </div>
      );
    }
    if (block.type === "list" && block.items) {
      return (
        <div className="space-y-1">
          {block.title && <h4 className="font-semibold text-foreground">{block.title}</h4>}
          <ul className="pl-1 space-y-2">
            {block.items.map((item, idx) => {
              const Icon =
                section.id === "waste" ? getWasteIcon(item) : null;
              return (
                <li key={idx} className="flex items-start gap-2">
                  {Icon ? (
                    <Icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                  )}
                  <span>{item}</span>
                </li>
              );
            })}
          </ul>
        </div>
      );
    }
    if (block.type === "checkbox" && block.items) {
      return (
        <div className="space-y-1">
          {block.title && <h4 className="font-semibold text-foreground">{block.title}</h4>}
          <ul className="space-y-1">
            {block.items.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    return null;
  };

  const shareGuide = async () => {
    const guideUrl = `${window.location.origin}/property/${property.id}/guide`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${property.title} - Guest Guide`, url: guideUrl });
      } else {
        await navigator.clipboard.writeText(guideUrl);
        toast({ title: "Link copied!", description: "Guest guide link copied to clipboard." });
      }
    } catch {
      await navigator.clipboard.writeText(guideUrl);
      toast({ title: "Link copied!", description: "Guest guide link copied to clipboard." });
    }
  };

  const exportToPDF = () => toast({ title: "PDF Export", description: "Coming soon!" });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex p-0">
        {/* Sidebar */}
        <div className="w-28 border-r border-muted/20 bg-card/50 flex flex-col items-center py-6 gap-6 overflow-y-auto">
          {allSections.map((section, index) => {
            const isActive = activeIndex === index;
            const Icon = section.icon || Info;
            return (
              <button
                key={section.id}
                onClick={() => setActiveIndex(index)}
                className={`p-3 rounded-xl transition-all flex items-center justify-center ${
                  isActive ? "bg-primary text-white shadow-md scale-110" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="h-6 w-6" />
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <DialogHeader className="mb-6">
            <div className="flex items-start justify-between">
              <DialogTitle className="text-3xl font-bold">{allSections[activeIndex].title}</DialogTitle>
              <div className="flex gap-2 mt-1">
                <Button variant="outline" size="icon" onClick={shareGuide}>
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={exportToPDF}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {allSections[activeIndex].image_url && (
            <img
              src={allSections[activeIndex].image_url}
              alt={allSections[activeIndex].title}
              className="w-full h-48 object-cover rounded-lg mb-6"
            />
          )}

          <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed space-y-4">
            {allSections[activeIndex].blocks.map((block) => (
              <div key={block.id}>{renderBlock(allSections[activeIndex], block)}</div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestGuideDialog;
