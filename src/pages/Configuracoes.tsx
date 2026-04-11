import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function Configuracoes() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">
          Ajustes gerais do sistema (Acesso restrito ao Admin).
        </p>
      </div>

      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="planos">Planos e Preços</TabsTrigger>
          <TabsTrigger value="profissionais">Profissionais</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Estúdio</CardTitle>
              <CardDescription>
                Atualize os dados que aparecem nos contratos e recibos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Estúdio</Label>
                  <Input defaultValue="Studio Tatiane Kafka Ghizoni" />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input defaultValue="00.000.000/0001-00" />
                </div>
                <div className="space-y-2">
                  <Label>Telefone Principal</Label>
                  <Input defaultValue="(48) 9999-9999" />
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input defaultValue="Rua das Flores, 123 - Centro" />
                </div>
              </div>
              <Button>Salvar Alterações</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planos">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Planos</CardTitle>
              <CardDescription>Cadastre ou edite as opções de planos oferecidos.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Módulo em desenvolvimento.</p>
              <Button variant="outline">Adicionar Plano</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profissionais">
          <Card>
            <CardHeader>
              <CardTitle>Equipe de Profissionais</CardTitle>
              <CardDescription>Gerencie acessos e comissionamentos.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Módulo em desenvolvimento.</p>
              <Button variant="outline">Convidar Profissional</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
