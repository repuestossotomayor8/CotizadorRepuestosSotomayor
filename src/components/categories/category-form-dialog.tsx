import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { categorySchema, CategoryFormValues } from '@/lib/schemas';
import { useCreateCategory, useUpdateCategory, useCategories } from '@/hooks/use-supabase';
import { Category } from '@/types';
import { toast } from 'sonner';
import { Save, X, ChevronDown, Check, Search } from 'lucide-react';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
}

export function CategoryFormDialog({ open, onOpenChange, category }: CategoryFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const { data: categoriesList = [] } = useCategories();
  
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');
  const sectionDropdownRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      section: category?.section || '',
    },
    values: {
      name: category?.name || '',
      section: category?.section || '',
    },
  });

  const watchSection = watch('section');

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sectionDropdownRef.current && !sectionDropdownRef.current.contains(event.target as Node)) {
        setIsSectionDropdownOpen(false);
      }
    }
    if (isSectionDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSectionDropdownOpen]);

  // Extract unique sections and sort alphabetically
  const uniqueSections = useMemo(() => {
    const sections = new Set<string>();
    // Pre-populate standard/common sections
    sections.add('Motor');
    sections.add('Suspensión');
    sections.add('Transmisión');
    sections.add('Tren Delantero');
    sections.add('Frenos');
    sections.add('Embrague');
    
    // Add sections from existing categories
    categoriesList.forEach((c) => {
      if (c.section) sections.add(c.section);
    });

    return Array.from(sections).sort();
  }, [categoriesList]);

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!sectionSearchQuery) return uniqueSections;
    const lowerQuery = sectionSearchQuery.toLowerCase();
    return uniqueSections.filter((s) => s.toLowerCase().includes(lowerQuery));
  }, [uniqueSections, sectionSearchQuery]);

  const showCustomOption = sectionSearchQuery.trim() !== '' && 
    !uniqueSections.some(s => s.toLowerCase() === sectionSearchQuery.trim().toLowerCase());

  const onSubmit = async (data: CategoryFormValues) => {
    setIsSubmitting(true);
    try {
      if (category) {
        await updateCategory.mutateAsync({ id: category.id, ...data });
        toast.success('Categoría actualizada exitosamente');
      } else {
        await createCategory.mutateAsync(data);
        toast.success('Categoría creada exitosamente');
      }
      onOpenChange(false);
      reset();
    } catch (error: any) {
      toast.error('Error al guardar la categoría', {
        description: error.message || 'Ocurrió un error inesperado',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 bg-slate-50 overflow-visible">
        <DialogHeader className="p-6 pb-4 border-b border-slate-200 bg-white">
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center justify-between">
            {category ? 'Editar Categoría' : 'Añadir Nueva Categoría'}
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            {category ? 'Modifica los detalles de esta categoría.' : 'Ingresa los datos para una nueva categoría de inventario.'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-visible">
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">
              Nombre de la Categoría *
            </label>
            <Input
              placeholder="Ej. Pastillas de Freno"
              {...register('name')}
              className="bg-white border-slate-200 focus-visible:ring-emerald-500"
            />
            {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">
              Sección Principal *
            </label>
            <div className="relative" ref={sectionDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsSectionDropdownOpen(!isSectionDropdownOpen);
                  setSectionSearchQuery('');
                }}
                className="flex h-[36px] w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 text-[14px] items-center justify-between hover:bg-slate-100/70"
              >
                {watchSection ? (
                  <span className="font-semibold text-slate-800">{watchSection}</span>
                ) : (
                  <span className="text-slate-400">Seleccionar sección...</span>
                )}
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform duration-200" style={{ transform: isSectionDropdownOpen ? 'rotate(180deg)' : 'none' }} />
              </button>

              {isSectionDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden flex flex-col max-h-[250px]">
                  {/* Dropdown Search Bar */}
                  <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-1.5 shrink-0">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar o escribir sección..."
                      value={sectionSearchQuery}
                      onChange={(e) => setSectionSearchQuery(e.target.value)}
                      className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none border-none ring-0 focus:ring-0"
                      autoFocus
                    />
                    {sectionSearchQuery && (
                      <button type="button" onClick={() => setSectionSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown List */}
                  <div className="overflow-y-auto p-1.5 space-y-0.5 flex-1">
                    {/* Custom Typed Option */}
                    {showCustomOption && (
                      <button
                        type="button"
                        onClick={() => {
                          setValue('section', sectionSearchQuery.trim(), { shouldDirty: true, shouldValidate: true });
                          setIsSectionDropdownOpen(false);
                        }}
                        className="flex items-center justify-between w-full px-2.5 py-2 rounded text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold transition-colors text-left"
                      >
                        <span>+ Usar nueva sección: "{sectionSearchQuery.trim()}"</span>
                      </button>
                    )}

                    {filteredSections.length === 0 && !showCustomOption ? (
                      <p className="text-center text-xs text-slate-400 py-6">Escribe para crear esta sección</p>
                    ) : (
                      filteredSections.map((sec) => {
                        const isSelected = sec === watchSection;
                        return (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => {
                              setValue('section', sec, { shouldDirty: true, shouldValidate: true });
                              setIsSectionDropdownOpen(false);
                            }}
                            className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded text-xs transition-colors text-left ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-800 font-semibold'
                                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <span>{sec}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
              {/* Hidden input for form integration */}
              <input type="hidden" {...register('section')} />
            </div>
            {errors.section && <p className="text-[11px] text-red-500 mt-1">{errors.section.message}</p>}
            <p className="text-[11px] text-slate-500 mt-1.5">
              Las categorías se agruparán por sección en los filtros.
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : 'Guardar Categoría'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
