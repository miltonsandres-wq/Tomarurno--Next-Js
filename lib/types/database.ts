export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      anuncios: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          imagen_url: string
          orden: number
          sucursal_id: string
          titulo: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          imagen_url: string
          orden?: number
          sucursal_id: string
          titulo?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          imagen_url?: string
          orden?: number
          sucursal_id?: string
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anuncios_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion: {
        Row: {
          clave: string
          id: string
          sucursal_id: string
          updated_at: string
          valor: string
        }
        Insert: {
          clave: string
          id?: string
          sucursal_id: string
          updated_at?: string
          valor: string
        }
        Update: {
          clave?: string
          id?: string
          sucursal_id?: string
          updated_at?: string
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      contadores_ticket: {
        Row: {
          fecha: string
          servicio_id: string
          siguiente_numero: number
        }
        Insert: {
          fecha: string
          servicio_id: string
          siguiente_numero?: number
        }
        Update: {
          fecha?: string
          servicio_id?: string
          siguiente_numero?: number
        }
        Relationships: [
          {
            foreignKeyName: "contadores_ticket_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      pausas_agente: {
        Row: {
          agente_id: string
          created_at: string
          fin: string | null
          id: string
          inicio: string
          motivo: string | null
        }
        Insert: {
          agente_id: string
          created_at?: string
          fin?: string | null
          id?: string
          inicio?: string
          motivo?: string | null
        }
        Update: {
          agente_id?: string
          created_at?: string
          fin?: string | null
          id?: string
          inicio?: string
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pausas_agente_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          sucursal_id: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id: string
          nombre: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
          sucursal_id?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
          sucursal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      servicios: {
        Row: {
          activo: boolean
          created_at: string
          icono: string
          id: string
          nombre: string
          prefijo_ticket: string
          sucursal_id: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          icono?: string
          id?: string
          nombre: string
          prefijo_ticket: string
          sucursal_id: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          icono?: string
          id?: string
          nombre?: string
          prefijo_ticket?: string
          sucursal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicios_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
      sucursales: {
        Row: {
          activa: boolean
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      turnos: {
        Row: {
          agente_id: string | null
          atencion_inicio_at: string | null
          codigo_ticket: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_turno"]
          fecha_ticket: string
          finalizado_at: string | null
          id: string
          llamado_at: string | null
          numero_ticket: number
          prefijo_ticket: string
          prioridad: Database["public"]["Enums"]["prioridad_turno"]
          servicio_id: string
          sucursal_id: string
          ventanilla_id: string | null
        }
        Insert: {
          agente_id?: string | null
          atencion_inicio_at?: string | null
          codigo_ticket?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_turno"]
          fecha_ticket?: string
          finalizado_at?: string | null
          id?: string
          llamado_at?: string | null
          numero_ticket: number
          prefijo_ticket: string
          prioridad?: Database["public"]["Enums"]["prioridad_turno"]
          servicio_id: string
          sucursal_id: string
          ventanilla_id?: string | null
        }
        Update: {
          agente_id?: string | null
          atencion_inicio_at?: string | null
          codigo_ticket?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_turno"]
          fecha_ticket?: string
          finalizado_at?: string | null
          id?: string
          llamado_at?: string | null
          numero_ticket?: number
          prefijo_ticket?: string
          prioridad?: Database["public"]["Enums"]["prioridad_turno"]
          servicio_id?: string
          sucursal_id?: string
          ventanilla_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turnos_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnos_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnos_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnos_ventanilla_id_fkey"
            columns: ["ventanilla_id"]
            isOneToOne: false
            referencedRelation: "ventanillas"
            referencedColumns: ["id"]
          },
        ]
      }
      ventanilla_agentes: {
        Row: {
          agente_id: string
          ventanilla_id: string
        }
        Insert: {
          agente_id: string
          ventanilla_id: string
        }
        Update: {
          agente_id?: string
          ventanilla_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ventanilla_agentes_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventanilla_agentes_ventanilla_id_fkey"
            columns: ["ventanilla_id"]
            isOneToOne: false
            referencedRelation: "ventanillas"
            referencedColumns: ["id"]
          },
        ]
      }
      ventanilla_servicios: {
        Row: {
          servicio_id: string
          ventanilla_id: string
        }
        Insert: {
          servicio_id: string
          ventanilla_id: string
        }
        Update: {
          servicio_id?: string
          ventanilla_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ventanilla_servicios_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventanilla_servicios_ventanilla_id_fkey"
            columns: ["ventanilla_id"]
            isOneToOne: false
            referencedRelation: "ventanillas"
            referencedColumns: ["id"]
          },
        ]
      }
      ventanillas: {
        Row: {
          activa: boolean
          created_at: string
          id: string
          nombre: string
          sucursal_id: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          id?: string
          nombre: string
          sucursal_id: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          id?: string
          nombre?: string
          sucursal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ventanillas_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_turnos_publicos: {
        Row: {
          codigo_ticket: string | null
          created_at: string | null
          estado: Database["public"]["Enums"]["estado_turno"] | null
          id: string | null
          llamado_at: string | null
          prioridad: Database["public"]["Enums"]["prioridad_turno"] | null
          servicio_id: string | null
          sucursal_id: string | null
          ventanilla_id: string | null
          ventanilla_nombre: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turnos_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnos_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnos_ventanilla_id_fkey"
            columns: ["ventanilla_id"]
            isOneToOne: false
            referencedRelation: "ventanillas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      finalizar_turno: {
        Args: { p_turno_id: string }
        Returns: {
          agente_id: string | null
          atencion_inicio_at: string | null
          codigo_ticket: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_turno"]
          fecha_ticket: string
          finalizado_at: string | null
          id: string
          llamado_at: string | null
          numero_ticket: number
          prefijo_ticket: string
          prioridad: Database["public"]["Enums"]["prioridad_turno"]
          servicio_id: string
          sucursal_id: string
          ventanilla_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "turnos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_rol_actual: {
        Args: never
        Returns: Database["public"]["Enums"]["rol_usuario"]
      }
      fn_siguiente_numero_ticket: {
        Args: { p_fecha: string; p_servicio_id: string }
        Returns: number
      }
      fn_sucursal_actual: { Args: never; Returns: string }
      iniciar_atencion: {
        Args: { p_turno_id: string }
        Returns: {
          agente_id: string | null
          atencion_inicio_at: string | null
          codigo_ticket: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_turno"]
          fecha_ticket: string
          finalizado_at: string | null
          id: string
          llamado_at: string | null
          numero_ticket: number
          prefijo_ticket: string
          prioridad: Database["public"]["Enums"]["prioridad_turno"]
          servicio_id: string
          sucursal_id: string
          ventanilla_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "turnos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      llamar_siguiente_turno: {
        Args: { p_ventanilla_id: string }
        Returns: {
          agente_id: string | null
          atencion_inicio_at: string | null
          codigo_ticket: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_turno"]
          fecha_ticket: string
          finalizado_at: string | null
          id: string
          llamado_at: string | null
          numero_ticket: number
          prefijo_ticket: string
          prioridad: Database["public"]["Enums"]["prioridad_turno"]
          servicio_id: string
          sucursal_id: string
          ventanilla_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "turnos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      marcar_ausente_manual: {
        Args: { p_turno_id: string }
        Returns: {
          agente_id: string | null
          atencion_inicio_at: string | null
          codigo_ticket: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_turno"]
          fecha_ticket: string
          finalizado_at: string | null
          id: string
          llamado_at: string | null
          numero_ticket: number
          prefijo_ticket: string
          prioridad: Database["public"]["Enums"]["prioridad_turno"]
          servicio_id: string
          sucursal_id: string
          ventanilla_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "turnos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reactivar_ausente: {
        Args: { p_turno_id: string }
        Returns: {
          agente_id: string | null
          atencion_inicio_at: string | null
          codigo_ticket: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_turno"]
          fecha_ticket: string
          finalizado_at: string | null
          id: string
          llamado_at: string | null
          numero_ticket: number
          prefijo_ticket: string
          prioridad: Database["public"]["Enums"]["prioridad_turno"]
          servicio_id: string
          sucursal_id: string
          ventanilla_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "turnos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rellamar_turno: {
        Args: { p_turno_id: string }
        Returns: {
          agente_id: string | null
          atencion_inicio_at: string | null
          codigo_ticket: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_turno"]
          fecha_ticket: string
          finalizado_at: string | null
          id: string
          llamado_at: string | null
          numero_ticket: number
          prefijo_ticket: string
          prioridad: Database["public"]["Enums"]["prioridad_turno"]
          servicio_id: string
          sucursal_id: string
          ventanilla_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "turnos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      tomar_ticket: {
        Args: {
          p_prioridad: Database["public"]["Enums"]["prioridad_turno"]
          p_servicio_id: string
        }
        Returns: {
          agente_id: string | null
          atencion_inicio_at: string | null
          codigo_ticket: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_turno"]
          fecha_ticket: string
          finalizado_at: string | null
          id: string
          llamado_at: string | null
          numero_ticket: number
          prefijo_ticket: string
          prioridad: Database["public"]["Enums"]["prioridad_turno"]
          servicio_id: string
          sucursal_id: string
          ventanilla_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "turnos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      estado_turno:
        | "ESPERANDO"
        | "LLAMANDO"
        | "EN_ATENCION"
        | "FINALIZADO"
        | "AUSENTE"
      prioridad_turno: "NORMAL" | "PREFERENCIAL" | "URGENTE"
      rol_usuario: "agente" | "supervisor" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_turno: [
        "ESPERANDO",
        "LLAMANDO",
        "EN_ATENCION",
        "FINALIZADO",
        "AUSENTE",
      ],
      prioridad_turno: ["NORMAL", "PREFERENCIAL", "URGENTE"],
      rol_usuario: ["agente", "supervisor", "admin"],
    },
  },
} as const
